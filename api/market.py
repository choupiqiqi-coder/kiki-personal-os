"""Read-only AKShare market endpoint for Kiki Personal OS."""

import json
import hmac
import math
import os
import time as time_module
from datetime import date, datetime, time, timezone
from http.server import BaseHTTPRequestHandler, HTTPServer
from zoneinfo import ZoneInfo
from urllib.parse import parse_qs, urlparse

import akshare as ak

SHANGHAI = ZoneInfo("Asia/Shanghai")
INDEX_TARGETS = {
    "上证指数": "000001",
    "深证成指": "399001",
    "创业板指": "399006",
    "沪深300": "000300",
    "中证A500": "000510",
}
US_INDEX_TARGETS = {"NASDAQ-100": ".NDX", "NASDAQ Composite": ".IXIC", "S&P 500": ".INX", "Dow Jones": ".DJI"}


def finite_number(value):
    try:
        result = float(value)
    except (TypeError, ValueError):
        raise ValueError(f"行情字段不是有效数字: {value!r}")
    if not math.isfinite(result):
        raise ValueError("行情字段为空或非有限数字")
    return result


def market_data_time():
    now = datetime.now(SHANGHAI)
    calendar = ak.tool_trade_date_hist_sina()
    normalized = [item.date() if isinstance(item, datetime) or hasattr(item, "date") else item for item in calendar["trade_date"]]
    dates = sorted({item for item in normalized if item <= now.date()})
    if not dates:
        raise RuntimeError("无法确定最近交易日")
    latest = dates[-1]
    if latest == now.date() and now.time() < time(9, 15) and len(dates) > 1:
        latest = dates[-2]
    if latest == now.date() and time(9, 15) <= now.time() <= time(15, 0):
        stamp = now
    else:
        stamp = datetime.combine(latest, time(15, 0), SHANGHAI)
    return stamp.isoformat()


def retry_call(call, attempts=3):
    last_error = None
    for attempt in range(attempts):
        try:
            return call()
        except Exception as error:
            last_error = error
            if attempt + 1 < attempts:
                time_module.sleep(0.8 * (attempt + 1))
    raise last_error


def fetch_indices(data_time):
    found = {}
    # The daily endpoint is intentionally used for a stable "latest valid" view.
    # It also provides an explicit trading date outside market hours.
    symbols = {"上证指数": "sh000001", "深证成指": "sz399001", "创业板指": "sz399006", "沪深300": "sh000300", "中证A500": "sh000510"}
    latest_dates = []
    for name, symbol in symbols.items():
        frame = retry_call(lambda selected=symbol: ak.stock_zh_index_daily(symbol=selected))
        if len(frame.index) < 2:
            raise RuntimeError(f"AKShare 缺少{name}最近两个交易日数据")
        previous, latest = frame.iloc[-2], frame.iloc[-1]
        close = finite_number(latest["close"])
        previous_close = finite_number(previous["close"])
        latest_date = latest["date"].date() if hasattr(latest["date"], "date") else date.fromisoformat(str(latest["date"])[:10])
        latest_dates.append(latest_date)
        point_time = datetime.combine(latest_date, time(15, 0), SHANGHAI).isoformat()
        found[name] = {"code": INDEX_TARGETS[name], "name": name, "value": close, "changePercent": (close / previous_close - 1) * 100, "dataTime": point_time}
    conservative_date = min(latest_dates)
    effective_time = datetime.combine(conservative_date, time(15, 0), SHANGHAI).isoformat()
    return [found[name] for name in INDEX_TARGETS], effective_time, "Sina"


def fetch_breadth_and_turnover(data_time):
    source = "Sina"
    frame = retry_call(ak.stock_zh_a_spot, 3)
    symbols = frame.iloc[:, 0].astype(str)
    frame = frame[symbols.str.startswith(("sh", "sz"))]
    change_columns = [frame.iloc[:, 4]]
    turnover_columns = [frame.iloc[:, 12]]
    changes = []
    turnover = 0.0
    for column in change_columns:
        for value in column:
            try:
                number = float(value)
                if math.isfinite(number):
                    changes.append(number)
            except (TypeError, ValueError):
                continue
    for column in turnover_columns:
        for value in column:
            try:
                number = float(value)
                if math.isfinite(number):
                    turnover += number
            except (TypeError, ValueError):
                continue
    if not changes or turnover <= 0:
        raise RuntimeError("AKShare 沪深股票行情为空")
    breadth = {
        "advancing": sum(1 for value in changes if value > 0),
        "declining": sum(1 for value in changes if value < 0),
        "unchanged": sum(1 for value in changes if value == 0),
        "dataTime": data_time,
    }
    return breadth, {"amount": turnover, "previousAmount": None, "currency": "CNY", "dataTime": data_time}, source


def fetch_sectors(data_time):
    source = "10jqka"
    frame = retry_call(lambda: ak.stock_fund_flow_industry(symbol="即时"))
    names, changes = frame.iloc[:, 1], frame.iloc[:, 3]
    sectors = []
    for name_value, change_value in zip(names, changes):
        name = str(name_value).strip()
        if not name:
            continue
        try:
            change = finite_number(str(change_value).rstrip("%"))
        except ValueError:
            continue
        sectors.append({"name": name, "changePercent": change, "dataTime": data_time})
    if len(sectors) < 10:
        raise RuntimeError("AKShare 行业板块数据不足")
    return sectors, source


def build_overview():
    live_data_time = market_data_time()
    fetched_at = datetime.now(timezone.utc).isoformat()
    indices, index_data_time, index_source = fetch_indices(live_data_time)
    breadth, turnover, breadth_source = fetch_breadth_and_turnover(live_data_time)
    sectors, sector_source = fetch_sectors(live_data_time)
    return {
        "indices": indices,
        "breadth": breadth,
        "turnover": turnover,
        "sectors": sectors,
        "provider": "akshare",
        "source": f"AKShare / {index_source} + {breadth_source} + {sector_source}",
        "dataTime": min(index_data_time, live_data_time),
        "fetchedAt": fetched_at,
    }


def nullable_number(value):
    try:
        return finite_number(value)
    except (TypeError, ValueError):
        return None


def fetch_fund(code):
    if not code.isdigit() or len(code) != 6:
        raise ValueError("基金代码必须为 6 位数字")
    nav_frame = retry_call(lambda: ak.fund_open_fund_info_em(symbol=code, indicator="单位净值走势"))
    if nav_frame.empty:
        raise RuntimeError("AKShare 未返回该基金净值")
    points = []
    for _, row in nav_frame.tail(366).iterrows():
        points.append({"date": str(row["净值日期"])[:10], "unitNav": finite_number(row["单位净值"]), "dailyChangePercent": nullable_number(row["日增长率"])})
    name = None
    fund_type = None
    benchmark = None
    try:
        names = retry_call(ak.fund_name_em)
        matched = names[names["基金代码"].astype(str).str.zfill(6) == code]
        if not matched.empty:
            name = str(matched.iloc[0]["基金简称"])
            fund_type = str(matched.iloc[0]["基金类型"])
    except Exception:
        pass
    try:
        basic = retry_call(lambda: ak.fund_individual_basic_info_xq(symbol=code))
        items = {str(row["item"]): row["value"] for _, row in basic.iterrows()}
        name = str(items.get("基金名称") or name) if items.get("基金名称") or name else None
        fund_type = str(items.get("基金类型") or fund_type) if items.get("基金类型") or fund_type else None
        benchmark_value = items.get("业绩比较基准")
        benchmark = None if benchmark_value is None or str(benchmark_value) == "<NA>" else str(benchmark_value)
    except Exception:
        pass
    return {"code": code, "name": name, "fundType": fund_type, "benchmark": benchmark, "latest": points[-1], "history": points, "provider": "akshare", "source": "AKShare / Eastmoney + Xueqiu", "fetchedAt": datetime.now(timezone.utc).isoformat()}


def us_session_state(latest_date):
    now_ny = datetime.now(ZoneInfo("America/New_York"))
    if now_ny.weekday() >= 5:
        return "weekend", "美股周末休市"
    if latest_date < now_ny.date():
        if now_ny.time() < time(9, 30):
            return "pre_market", "美股尚未开盘；展示最近有效收盘"
        return "closed", "今日可能休市或日线尚未更新；展示最近有效收盘"
    if now_ny.time() < time(9, 30):
        return "pre_market", "美股尚未开盘；展示最近有效收盘"
    if now_ny.time() <= time(16, 0):
        return "open", "美股交易时段；当前接口仅展示最近有效日线，不是盘中实时行情"
    return "closed", "美股已收盘；展示最近有效收盘"


def fetch_us_market():
    indices = []
    latest_dates = []
    for position, (name, symbol) in enumerate(US_INDEX_TARGETS.items()):
        if position:
            time_module.sleep(1.2)
        try:
            frame = retry_call(lambda selected=symbol: ak.index_us_stock_sina(symbol=selected), 5)
        except Exception as error:
            raise RuntimeError(f"AKShare 获取{name}失败: {error}") from error
        if len(frame.index) < 2:
            raise RuntimeError(f"AKShare 缺少{name}最近两个交易日数据")
        previous, latest = frame.iloc[-2], frame.iloc[-1]
        close = finite_number(latest["close"])
        previous_close = finite_number(previous["close"])
        trading_date = latest["date"].date() if hasattr(latest["date"], "date") else date.fromisoformat(str(latest["date"])[:10])
        latest_dates.append(trading_date)
        indices.append({"code": symbol, "name": name, "value": close, "changePercent": (close / previous_close - 1) * 100, "tradingDate": trading_date.isoformat()})
    conservative_date = min(latest_dates)
    session, session_message = us_session_state(conservative_date)
    market_time = datetime.combine(conservative_date, time(16, 0), ZoneInfo("America/New_York")).isoformat()
    return {"indices": indices, "session": session, "sessionMessage": session_message, "provider": "akshare", "source": "AKShare / Sina US Index", "marketTime": market_time, "fetchedAt": datetime.now(timezone.utc).isoformat()}


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        expected = os.environ.get("MARKET_DATA_API_KEY", "").strip()
        dedicated_key = self.headers.get("X-Kiki-Market-Key", "").strip()
        standard_key = self.headers.get("X-API-Key", "").strip()
        legacy_authorization = self.headers.get("Authorization", "").strip()
        supplied_keys = (dedicated_key, standard_key, legacy_authorization.removeprefix("Bearer "))
        authenticated = bool(expected) and any(
            supplied and hmac.compare_digest(supplied, expected) for supplied in supplied_keys
        )
        if not expected or not authenticated:
            print(
                "market_auth_denied",
                f"configured={bool(expected)}",
                f"dedicated_header={bool(dedicated_key)}",
                f"standard_header={bool(standard_key)}",
                f"bearer_header={legacy_authorization.startswith('Bearer ')}",
                flush=True,
            )
            self._json(401, {"error": "unauthorized"})
            return
        try:
            query = parse_qs(urlparse(self.path).query)
            if query.get("type", [""])[0] == "fund":
                self._json(200, fetch_fund(query.get("code", [""])[0]))
            elif query.get("type", [""])[0] == "us_market":
                self._json(200, fetch_us_market())
            else:
                self._json(200, build_overview())
        except Exception as error:
            self._json(502, {"error": "akshare_fetch_failed", "message": str(error)})

    def _json(self, status, payload):
        body = json.dumps(payload, ensure_ascii=False, allow_nan=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *_args):
        return


if __name__ == "__main__":
    port = int(os.environ.get("AKSHARE_PORT", "8765"))
    HTTPServer(("127.0.0.1", port), handler).serve_forever()
