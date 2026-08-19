import "server-only";
import type { ChinaMarketProvider, MarketOverview, USIndexMarketProvider, USMarketOverview } from "../types";
import { compactChinaTime, finiteNumber, getUSSession, newestIso, newYorkTimeToIso, validateChinaIndices, validateUSIndices } from "./shared";

const CHINA_ENDPOINT = "https://qt.gtimg.cn/q=sh000001,sh000300,sh000510";
const US_ENDPOINT = "https://qt.gtimg.cn/q=usNDX,usINX,usDJI";

export class TencentMarketProvider implements ChinaMarketProvider, USIndexMarketProvider {
  readonly id = "tencent";

  constructor(private readonly fetcher: typeof fetch = fetch, private readonly timeoutMs = 7_000) {}

  async getMarketOverview(): Promise<MarketOverview> {
    const body = await this.request(CHINA_ENDPOINT);
    const indices = validateChinaIndices(parseLines(body).map(({ variable, fields }) => ({
      code: variable.replace(/^v_sh/, ""),
      name: fields[1] ?? "",
      value: finiteNumber(fields[3], "指数点位"),
      changePercent: finiteNumber(fields[32], "指数涨跌幅"),
      dataTime: compactChinaTime(fields[30] ?? ""),
    })));
    return {
      indices,
      sectors: [],
      provider: this.id,
      source: "腾讯财经市场参考行情",
      dataTime: newestIso(indices.map((item) => item.dataTime)),
      fetchedAt: new Date().toISOString(),
    };
  }

  async getUSMarketOverview(): Promise<USMarketOverview> {
    const body = await this.request(US_ENDPOINT);
    const parsed = parseLines(body).map(({ fields }) => {
      const marketTime = newYorkTimeToIso(fields[30] ?? "");
      return {
        index: {
          code: fields[2] ?? "",
          name: normalizeUSName(fields[2] ?? ""),
          value: finiteNumber(fields[3], "指数点位"),
          changePercent: finiteNumber(fields[32], "指数涨跌幅"),
          tradingDate: marketTime.slice(0, 10),
        },
        marketTime,
      };
    });
    const indices = validateUSIndices(parsed.map((item) => item.index));
    const session = getUSSession();
    return {
      indices,
      ...session,
      provider: this.id,
      source: "腾讯财经市场参考行情",
      marketTime: newestIso(parsed.map((item) => item.marketTime)),
      fetchedAt: new Date().toISOString(),
    };
  }

  private async request(url: string): Promise<string> {
    const response = await this.fetcher(url, { cache: "no-store", signal: AbortSignal.timeout(this.timeoutMs) });
    if (!response.ok) throw new Error(`腾讯财经返回 HTTP ${response.status}`);
    return new TextDecoder("gbk").decode(await response.arrayBuffer());
  }
}

function parseLines(body: string): Array<{ variable: string; fields: string[] }> {
  const lines = body.trim().split(/;\s*/).filter(Boolean).map((line) => {
    const match = line.match(/^(v_[^=]+)="(.*)"$/);
    if (!match || match[1] === "v_pv_none_match") throw new Error("腾讯财经文本结构无效");
    return { variable: match[1], fields: match[2].split("~") };
  });
  if (lines.length !== 3) throw new Error("腾讯财经核心指数数量不完整");
  return lines;
}

function normalizeUSName(code: string): string {
  if (code === ".NDX") return "NASDAQ-100";
  if (code === ".INX") return "S&P 500";
  if (code === ".DJI") return "Dow Jones";
  return "";
}
