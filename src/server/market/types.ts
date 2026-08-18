export type MarketQuote = { symbol: string; price: number | null; nav: number | null; changePercent: number | null; currency: string; provider: string; dataTime: string; fetchedAt: string };
export type MajorIndex = { code: string; name: string; value: number; changePercent: number; dataTime: string };
export type MarketBreadth = { advancing: number; declining: number; unchanged: number; dataTime: string };
export type MarketTurnover = { amount: number; previousAmount: number | null; currency: "CNY"; dataTime: string };
export type SectorPerformance = { name: string; changePercent: number; dataTime: string };
export type MarketMood = "strong" | "sideways" | "weak";
export type MarketOverview = { indices: MajorIndex[]; breadth: MarketBreadth; turnover: MarketTurnover; sectors: SectorPerformance[]; provider: string; source: string; dataTime: string; fetchedAt: string };
export type MarketOverviewResult = { data: MarketOverview | null; source: "provider" | "cache" | "cache_stale" | "unavailable"; message: string; error?: string };
export type FundNavPoint = { date: string; unitNav: number; dailyChangePercent: number | null };
export type FundNavData = {
  code: string; name: string | null; fundType: string | null; benchmark: string | null;
  latest: FundNavPoint; history: FundNavPoint[]; provider: string; source: string; fetchedAt: string;
};
export type USMarketSession = "pre_market" | "open" | "closed" | "weekend" | "unknown";
export type USMarketIndex = { code: string; name: string; value: number; changePercent: number; tradingDate: string };
export type USMarketOverview = { indices: USMarketIndex[]; session: USMarketSession; sessionMessage: string; provider: string; source: string; marketTime: string; fetchedAt: string };
export type USMarketOverviewResult = { data: USMarketOverview | null; source: "provider" | "cache" | "cache_stale" | "unavailable"; message: string; error?: string };

export interface MarketDataProvider {
  readonly id: string;
  getQuote(symbol: string): Promise<MarketQuote>;
  getFundNav(symbol: string): Promise<MarketQuote>;
  getFundNavHistory(symbol: string): Promise<FundNavData>;
  getIndexQuote(symbol: string): Promise<MarketQuote>;
  getMajorIndices(): Promise<MajorIndex[]>;
  getMarketBreadth(): Promise<MarketBreadth>;
  getMarketTurnover(): Promise<MarketTurnover>;
  getSectorPerformance(): Promise<SectorPerformance[]>;
  getMarketOverview(): Promise<MarketOverview>;
  getUSMajorIndices(): Promise<USMarketIndex[]>;
  getNasdaq100(): Promise<USMarketIndex>;
  getUSMarketOverview(): Promise<USMarketOverview>;
  getMarketSnapshot(): Promise<unknown>;
}
