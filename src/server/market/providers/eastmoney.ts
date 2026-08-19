import "server-only";
import type { ChinaMarketProvider, MarketOverview } from "../types";
import { finiteNumber, newestIso, validateChinaIndices } from "./shared";

const ENDPOINT = "https://push2.eastmoney.com/api/qt/ulist.np/get?fltt=2&fields=f2%2Cf3%2Cf4%2Cf12%2Cf13%2Cf14%2Cf124&secids=1.000001%2C1.000300%2C1.000510";

type EastmoneyPayload = {
  rc?: number;
  data?: { diff?: Array<{ f2?: number; f3?: number; f12?: string; f14?: string; f124?: number }> };
};

export class EastmoneyProvider implements ChinaMarketProvider {
  readonly id = "eastmoney";

  constructor(private readonly fetcher: typeof fetch = fetch, private readonly timeoutMs = 7_000) {}

  async getMarketOverview(): Promise<MarketOverview> {
    const response = await this.fetcher(ENDPOINT, {
      cache: "no-store",
      headers: { Accept: "application/json", Referer: "https://quote.eastmoney.com/", "User-Agent": "Kiki-Personal-OS/1.0" },
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!response.ok) throw new Error(`东方财富返回 HTTP ${response.status}`);
    const payload = await response.json() as EastmoneyPayload;
    if (payload.rc !== 0 || !Array.isArray(payload.data?.diff)) throw new Error("东方财富响应结构无效");
    const indices = validateChinaIndices(payload.data.diff.map((item) => ({
      code: String(item.f12 ?? ""),
      name: String(item.f14 ?? ""),
      value: finiteNumber(item.f2, "指数点位"),
      changePercent: finiteNumber(item.f3, "指数涨跌幅"),
      dataTime: item.f124 ? new Date(item.f124 * 1_000).toISOString() : "",
    })));
    return {
      indices,
      sectors: [],
      provider: this.id,
      source: "东方财富市场参考行情",
      dataTime: newestIso(indices.map((item) => item.dataTime)),
      fetchedAt: new Date().toISOString(),
    };
  }
}
