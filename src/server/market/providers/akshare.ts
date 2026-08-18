import "server-only";
import type { FundNavData, MajorIndex, MarketBreadth, MarketDataProvider, MarketOverview, MarketQuote, MarketTurnover, SectorPerformance, USMarketIndex, USMarketOverview } from "../types";

export class AKShareMarketDataProvider implements MarketDataProvider {
  readonly id = "akshare";
  constructor(private readonly baseUrl: string, private readonly apiKey: string) {}

  private async overview(): Promise<MarketOverview> {
    const response = await fetch(this.baseUrl, {
      headers: { authorization: `Bearer ${this.apiKey}`, accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(45_000),
    });
    if (!response.ok) throw new Error(`AKShare 服务返回 ${response.status}`);
    const value: unknown = await response.json();
    if (!isOverview(value)) throw new Error("AKShare 服务返回的数据结构无效");
    return value;
  }

  async getUSMarketOverview(): Promise<USMarketOverview> { const url=new URL(this.baseUrl);url.searchParams.set("type","us_market");const response=await fetch(url,{headers:{authorization:`Bearer ${this.apiKey}`,accept:"application/json"},cache:"no-store",signal:AbortSignal.timeout(45_000)});if(!response.ok)throw new Error(`AKShare 美股服务返回 ${response.status}`);const value:unknown=await response.json();if(!isUSOverview(value))throw new Error("AKShare 美股服务返回的数据结构无效");return value; }
  async getUSMajorIndices():Promise<USMarketIndex[]>{return(await this.getUSMarketOverview()).indices}
  async getNasdaq100():Promise<USMarketIndex>{const item=(await this.getUSMajorIndices()).find(index=>index.code===".NDX");if(!item)throw new Error("NASDAQ-100 数据缺失");return item}

  async getFundNavHistory(symbol: string): Promise<FundNavData> {
    const url = new URL(this.baseUrl);
    url.searchParams.set("type", "fund");
    url.searchParams.set("code", symbol);
    const response = await fetch(url, { headers: { authorization: `Bearer ${this.apiKey}`, accept: "application/json" }, cache: "no-store", signal: AbortSignal.timeout(45_000) });
    if (!response.ok) throw new Error(`AKShare 基金服务返回 ${response.status}`);
    const value: unknown = await response.json();
    if (!isFundNav(value)) throw new Error("AKShare 基金服务返回的数据结构无效");
    return value;
  }

  getMarketOverview(): Promise<MarketOverview> { return this.overview(); }
  async getMajorIndices(): Promise<MajorIndex[]> { return (await this.overview()).indices; }
  async getMarketBreadth(): Promise<MarketBreadth> { return (await this.overview()).breadth; }
  async getMarketTurnover(): Promise<MarketTurnover> { return (await this.overview()).turnover; }
  async getSectorPerformance(): Promise<SectorPerformance[]> { return (await this.overview()).sectors; }
  getMarketSnapshot(): Promise<unknown> { return this.overview(); }
  getQuote(): Promise<MarketQuote> { throw new Error("AKShare Lite Provider 暂不提供单标的报价"); }
  async getFundNav(symbol: string): Promise<MarketQuote> { const data = await this.getFundNavHistory(symbol); return { symbol, price: null, nav: data.latest.unitNav, changePercent: data.latest.dailyChangePercent, currency: "CNY", provider: data.provider, dataTime: data.latest.date, fetchedAt: data.fetchedAt }; }
  getIndexQuote(): Promise<MarketQuote> { throw new Error("请通过 getMajorIndices 获取核心指数"); }
}

function isFundNav(value: unknown): value is FundNavData { if (!value || typeof value !== "object") return false; const item=value as Partial<FundNavData>; return item.provider==="akshare" && typeof item.code==="string" && typeof item.fetchedAt==="string" && Boolean(item.latest && typeof item.latest.date==="string" && isFiniteNumber(item.latest.unitNav)) && Array.isArray(item.history) && item.history.every((point)=>typeof point?.date==="string" && isFiniteNumber(point?.unitNav) && (point.dailyChangePercent==null || isFiniteNumber(point.dailyChangePercent))); }
function isUSOverview(value:unknown):value is USMarketOverview{if(!value||typeof value!=="object")return false;const item=value as Partial<USMarketOverview>;return item.provider==="akshare"&&typeof item.source==="string"&&typeof item.marketTime==="string"&&typeof item.fetchedAt==="string"&&typeof item.sessionMessage==="string"&&Array.isArray(item.indices)&&item.indices.length===4&&item.indices.every(index=>typeof index?.code==="string"&&typeof index?.name==="string"&&isFiniteNumber(index?.value)&&isFiniteNumber(index?.changePercent)&&typeof index?.tradingDate==="string")}

function isFiniteNumber(value: unknown): value is number { return typeof value === "number" && Number.isFinite(value); }
function isOverview(value: unknown): value is MarketOverview {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<MarketOverview>;
  if (item.provider !== "akshare" || typeof item.source !== "string" || typeof item.dataTime !== "string" || typeof item.fetchedAt !== "string") return false;
  if (!Array.isArray(item.indices) || item.indices.length !== 5 || !Array.isArray(item.sectors) || !item.sectors.length) return false;
  if (!item.indices.every((index) => typeof index?.code === "string" && typeof index?.name === "string" && isFiniteNumber(index?.value) && isFiniteNumber(index?.changePercent) && typeof index?.dataTime === "string")) return false;
  if (!item.sectors.every((sector) => typeof sector?.name === "string" && isFiniteNumber(sector?.changePercent) && typeof sector?.dataTime === "string")) return false;
  return Boolean(item.breadth && Number.isInteger(item.breadth.advancing) && Number.isInteger(item.breadth.declining) && Number.isInteger(item.breadth.unchanged) && item.turnover && isFiniteNumber(item.turnover.amount));
}
