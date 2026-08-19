import type { MajorIndex, USMarketIndex, USMarketSession } from "../types";

export const CHINA_INDEX_NAMES = new Map([
  ["000001", "上证指数"],
  ["000300", "沪深300"],
  ["000510", "中证A500"],
]);

export const US_INDEX_NAMES = new Map([
  [".NDX", "NASDAQ-100"],
  [".INX", "S&P 500"],
  [".DJI", "Dow Jones"],
]);

export function finiteNumber(value: unknown, field: string): number {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) throw new Error(`${field} 不是有效数字`);
  return number;
}

export function validateChinaIndices(indices: MajorIndex[]): MajorIndex[] {
  if (indices.length !== CHINA_INDEX_NAMES.size) throw new Error("A 股核心指数数量不完整");
  for (const index of indices) {
    if (CHINA_INDEX_NAMES.get(index.code) !== index.name) throw new Error(`A 股指数代码或名称不匹配：${index.code}`);
    if (!Number.isFinite(index.value) || index.value <= 0) throw new Error(`A 股指数点位无效：${index.code}`);
    if (!Number.isFinite(index.changePercent)) throw new Error(`A 股指数涨跌幅无效：${index.code}`);
    if (!isValidDate(index.dataTime)) throw new Error(`A 股指数行情时间无效：${index.code}`);
  }
  return indices;
}

export function validateUSIndices(indices: USMarketIndex[]): USMarketIndex[] {
  if (indices.length !== US_INDEX_NAMES.size) throw new Error("美股核心指数数量不完整");
  for (const index of indices) {
    if (US_INDEX_NAMES.get(index.code) !== index.name) throw new Error(`美股指数代码或名称不匹配：${index.code}`);
    if (!Number.isFinite(index.value) || index.value <= 0) throw new Error(`美股指数点位无效：${index.code}`);
    if (!Number.isFinite(index.changePercent)) throw new Error(`美股指数涨跌幅无效：${index.code}`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(index.tradingDate)) throw new Error(`美股指数交易日期无效：${index.code}`);
  }
  return indices;
}

export function compactChinaTime(value: string): string {
  const match = value.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/);
  if (!match) throw new Error("腾讯 A 股行情时间格式无效");
  return zonedLocalDateTimeToIso(match.slice(1).map(Number), "Asia/Shanghai");
}

export function newYorkTimeToIso(value: string): string {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/);
  if (!match) throw new Error("腾讯美股行情时间格式无效");
  return zonedLocalDateTimeToIso(match.slice(1).map(Number), "America/New_York");
}

export function zonedLocalDateTimeToIso(parts: number[], timeZone: string): string {
  const [year, month, day, hour, minute, second] = parts;
  const desiredAsUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  let candidate = desiredAsUtc;
  for (let iteration = 0; iteration < 3; iteration += 1) {
    const actual = zonedParts(new Date(candidate), timeZone);
    const actualAsUtc = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute, actual.second);
    candidate -= actualAsUtc - desiredAsUtc;
  }
  const verified = zonedParts(new Date(candidate), timeZone);
  if ([verified.year, verified.month, verified.day, verified.hour, verified.minute, verified.second]
    .some((part, index) => part !== parts[index])) throw new Error(`${timeZone} 行情时间无法标准化`);
  return new Date(candidate).toISOString();
}

function zonedParts(date: Date, timeZone: string) {
  const values = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(date).map((part) => [part.type, part.value]));
  return {
    year: Number(values.year), month: Number(values.month), day: Number(values.day),
    hour: Number(values.hour), minute: Number(values.minute), second: Number(values.second),
  };
}

export function getUSSession(now = new Date()): { session: USMarketSession; sessionMessage: string } {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(now).map((part) => [part.type, part.value]));
  if (parts.weekday === "Sat" || parts.weekday === "Sun") return { session: "weekend", sessionMessage: "美股休市，显示最近有效市场参考行情" };
  const minutes = Number(parts.hour) * 60 + Number(parts.minute);
  if (minutes >= 570 && minutes < 960) return { session: "open", sessionMessage: "美股交易时段市场参考行情" };
  if (minutes >= 240 && minutes < 570) return { session: "pre_market", sessionMessage: "美股尚未开盘，显示最近有效市场参考行情" };
  return { session: "closed", sessionMessage: "美股已收盘，显示最近有效市场参考行情" };
}

export function newestIso(values: string[]): string {
  return values.reduce((latest, value) => new Date(value) > new Date(latest) ? value : latest);
}

function isValidDate(value: string): boolean {
  return Boolean(value) && Number.isFinite(new Date(value).getTime());
}
