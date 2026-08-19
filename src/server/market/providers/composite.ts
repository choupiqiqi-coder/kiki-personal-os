import type { ChinaMarketProvider, MarketOverview, USIndexMarketProvider, USMarketOverview } from "../types";

export class CompositeChinaMarketProvider implements ChinaMarketProvider {
  readonly id = "eastmoney+tencent";
  private readonly primary: ChinaMarketProvider;
  private readonly fallback: ChinaMarketProvider;

  constructor(primary: ChinaMarketProvider, fallback: ChinaMarketProvider) {
    this.primary = primary;
    this.fallback = fallback;
  }

  async getMarketOverview(): Promise<MarketOverview> {
    try {
      return await this.primary.getMarketOverview();
    } catch (primaryError) {
      try {
        return await this.fallback.getMarketOverview();
      } catch (fallbackError) {
        throw new AggregateError([primaryError, fallbackError], "A 股 Primary 与 Fallback 均获取失败");
      }
    }
  }
}

export class CompositeUSMarketProvider implements USIndexMarketProvider {
  readonly id = "tencent";
  private readonly primary: USIndexMarketProvider;

  constructor(primary: USIndexMarketProvider) {
    this.primary = primary;
  }

  getUSMarketOverview(): Promise<USMarketOverview> {
    return this.primary.getUSMarketOverview();
  }
}
