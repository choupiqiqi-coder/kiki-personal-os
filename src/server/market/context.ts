import "server-only";
import type { MarketOverview, USMarketOverview } from "./types";
import type { FundHolding } from "@/server/data/funds-lite";

export function createMarketContext(overview: MarketOverview) {
  const sectors = [...overview.sectors];
  return {
    provider: overview.provider,
    source: overview.source,
    marketDataTime: overview.dataTime,
    fetchedAt: overview.fetchedAt,
    indices: overview.indices.map(({ name, value, changePercent, dataTime }) => ({ name, value, changePercent, dataTime })),
    breadth: overview.breadth,
    turnover: overview.turnover,
    leadingSectors: sectors.sort((a, b) => b.changePercent - a.changePercent).slice(0, 5),
    laggingSectors: [...overview.sectors].sort((a, b) => a.changePercent - b.changePercent).slice(0, 5),
  };
}

export function createFundMarketContext(overview: MarketOverview, funds: FundHolding[]) {
  return {
    market: createMarketContext(overview),
    funds: funds.map((fund) => ({ code: fund.fund_code, name: fund.fund_name, fundType: fund.fund_type, benchmark: fund.benchmark, shares: fund.shares, costBasis: fund.cost_basis, latestNav: fund.latest_nav, navDate: fund.nav_date, dailyChangePercent: fund.daily_change_percent, marketValue: fund.market_value, cumulativeReturn: fund.cumulative_return, returnRate: fund.return_rate, quoteSource: fund.quote_source, quoteFetchedAt: fund.quote_fetched_at, associationStatus: fund.association_status })),
    disclaimer: "基金与市场关系仅使用公开资料中可验证的类型、基准或持仓；未知关系不得推测。",
  };
}
export function createCombinedMarketContext(aShare:MarketOverview,usMarket:USMarketOverview,funds:FundHolding[]){return{aShare:createMarketContext(aShare),usMarket:{provider:usMarket.provider,source:usMarket.source,marketTime:usMarket.marketTime,fetchedAt:usMarket.fetchedAt,session:usMarket.session,indices:usMarket.indices},funds:createFundMarketContext(aShare,funds).funds,guardrail:"指数表现不得直接描述或计算为用户基金实际收益；QDII 还受汇率、跟踪误差和净值更新时间影响。"}}
