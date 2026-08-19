import "server-only";
import type { FundNavData } from "@/server/market/types";
import type { FundNavProvider } from "../types";
import { validateFundCode } from "../types";

export class TencentFundNavProvider implements FundNavProvider {
  readonly id = "tencent_fund";
  constructor(private readonly fetcher: typeof fetch = fetch, private readonly timeoutMs = 7_000) {}

  async getFormalNav(rawCode: string): Promise<FundNavData> {
    const code = validateFundCode(rawCode);
    const response = await this.fetcher(`https://qt.gtimg.cn/q=jj${code}`, { cache: "no-store", signal: AbortSignal.timeout(this.timeoutMs) });
    if (!response.ok) throw new Error(`腾讯基金接口返回 ${response.status}`);
    const body = new TextDecoder("gbk").decode(await response.arrayBuffer());
    const match = body.trim().match(/^v_jj\d{6}="(.*)";?$/);
    if (!match) throw new Error("腾讯基金文本结构无效");
    const fields = match[1].split("~");
    const unitNav = Number(fields[5]);
    const accumulatedNav = fields[6] ? Number(fields[6]) : null;
    const dailyChangePercent = fields[7] ? Number(fields[7]) : null;
    const navDate = fields[8] ?? "";
    if (fields[0] !== code || !fields[1] || !Number.isFinite(unitNav) || unitNav <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(navDate)) throw new Error("腾讯基金正式净值字段无效");
    const latest = { date: navDate, unitNav, accumulatedNav: accumulatedNav != null && Number.isFinite(accumulatedNav) ? accumulatedNav : null, dailyChangePercent: dailyChangePercent != null && Number.isFinite(dailyChangePercent) ? dailyChangePercent : null };
    return { code, name: fields[1], fundType: inferFundType(fields[1]), benchmark: null, latest, history: [latest], provider: this.id, source: "腾讯财经正式基金净值", fetchedAt: new Date().toISOString() };
  }
}

function inferFundType(name: string): string | null {
  if (/QDII/i.test(name)) return "QDII";
  if (/ETF.*联接|联接.*ETF/i.test(name)) return "指数型-ETF联接";
  if (/指数/i.test(name)) return "指数型";
  if (/混合/i.test(name)) return "混合型";
  return null;
}
