import "server-only";
import type { FundNavData, FundNavPoint } from "@/server/market/types";
import type { FundNavProvider } from "../types";
import { validateFundCode } from "../types";

type HistoryPayload = { ErrCode?: number; Data?: { FundType?: string; LSJZList?: Array<{ FSRQ?: string; DWJZ?: string; LJJZ?: string; JZZZL?: string }> } };
type SearchPayload = { ErrCode?: number; Datas?: Array<{ CODE?: string; NAME?: string; FundBaseInfo?: { FCODE?: string; SHORTNAME?: string; FTYPE?: string; FUNDTYPE?: string } }> };

export class EastmoneyFundNavProvider implements FundNavProvider {
  readonly id = "eastmoney_fund";
  constructor(private readonly fetcher: typeof fetch = fetch, private readonly timeoutMs = 7_000) {}

  async getFormalNav(rawCode: string): Promise<FundNavData> {
    const code = validateFundCode(rawCode);
    const headers = { Accept: "application/json", Referer: "https://fundf10.eastmoney.com/", "User-Agent": "Kiki-Personal-OS/1.0" };
    const historyUrl = new URL("https://api.fund.eastmoney.com/f10/lsjz");
    historyUrl.search = new URLSearchParams({ fundCode: code, pageIndex: "1", pageSize: "30" }).toString();
    const metadataUrl = new URL("https://fundsuggest.eastmoney.com/FundSearch/api/FundSearchAPI.ashx");
    metadataUrl.search = new URLSearchParams({ m: "1", key: code }).toString();
    const [historyResponse, metadataResponse] = await Promise.all([
      this.fetcher(historyUrl, { headers, cache: "no-store", signal: AbortSignal.timeout(this.timeoutMs) }),
      this.fetcher(metadataUrl, { headers, cache: "no-store", signal: AbortSignal.timeout(this.timeoutMs) }),
    ]);
    if (!historyResponse.ok || !metadataResponse.ok) throw new Error(`东方财富基金接口返回 ${historyResponse.status}/${metadataResponse.status}`);
    const historyPayload = await historyResponse.json() as HistoryPayload;
    const metadataPayload = await metadataResponse.json() as SearchPayload;
    const metadata = metadataPayload.Datas?.find((item) => item.CODE === code || item.FundBaseInfo?.FCODE === code);
    const rows = historyPayload.Data?.LSJZList;
    if (historyPayload.ErrCode !== 0 || metadataPayload.ErrCode !== 0 || !metadata || !Array.isArray(rows) || !rows.length) throw new Error("东方财富基金正式净值结构无效");
    const history = rows.map(parsePoint);
    return {
      code,
      name: metadata.FundBaseInfo?.SHORTNAME || metadata.NAME || null,
      fundType: metadata.FundBaseInfo?.FTYPE || historyPayload.Data?.FundType || metadata.FundBaseInfo?.FUNDTYPE || null,
      benchmark: null,
      latest: history[0],
      history,
      provider: this.id,
      source: "东方财富正式基金净值",
      fetchedAt: new Date().toISOString(),
    };
  }
}

function parsePoint(row: { FSRQ?: string; DWJZ?: string; LJJZ?: string; JZZZL?: string }): FundNavPoint {
  const unitNav = Number(row.DWJZ);
  const accumulatedNav = row.LJJZ ? Number(row.LJJZ) : null;
  const dailyChangePercent = row.JZZZL === "" || row.JZZZL == null ? null : Number(row.JZZZL);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(row.FSRQ ?? "") || !Number.isFinite(unitNav) || unitNav <= 0 || (accumulatedNav != null && !Number.isFinite(accumulatedNav)) || (dailyChangePercent != null && !Number.isFinite(dailyChangePercent))) throw new Error("东方财富基金净值字段无效");
  return { date: row.FSRQ!, unitNav, accumulatedNav, dailyChangePercent };
}
