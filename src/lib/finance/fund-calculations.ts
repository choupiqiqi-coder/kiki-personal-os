export type FundValuationInput = { shares: number | null; manualHoldingAmount: number | null; costBasis: number; latestNav: number | null };
export function calculateFundValuation(input: FundValuationInput) {
  const marketValue = input.shares != null && input.latestNav != null ? input.shares * input.latestNav : input.manualHoldingAmount;
  const cumulativeReturn = marketValue == null ? null : marketValue - input.costBasis;
  const returnRate = cumulativeReturn == null || input.costBasis === 0 ? null : cumulativeReturn / input.costBasis;
  return { marketValue, cumulativeReturn, returnRate };
}

export function calculateLatestNavReturn(shares: number | null, latestNav: number | null, previousNav: number | null) {
  return shares == null || latestNav == null || previousNav == null ? null : shares * (latestNav - previousNav);
}

export function summarizeFundHoldings(rows: Array<{ market_value: number | null; cost_basis: number; latest_nav_return: number | null }>) {
  const complete = rows.length > 0 && rows.every((row) => row.market_value != null);
  const marketValue = complete ? rows.reduce((sum, row) => sum + Number(row.market_value), 0) : null;
  const investedCost = rows.reduce((sum, row) => sum + Number(row.cost_basis), 0);
  const holdingProfit = marketValue == null ? null : marketValue - investedCost;
  const returnRate = holdingProfit == null || investedCost === 0 ? null : holdingProfit / investedCost;
  const latestNavReturn = rows.some((row) => row.latest_nav_return == null) ? null : rows.reduce((sum, row) => sum + Number(row.latest_nav_return), 0);
  return { marketValue, investedCost, holdingProfit, returnRate, latestNavReturn };
}

export type FundSnapshotHoldingInput = {
  id: string; fund_code: string; fund_name: string; shares: number | null; cost_basis: number;
  latest_nav: number | null; nav_date: string | null; market_value: number | null;
  cumulative_return: number | null; return_rate: number | null; latest_nav_return: number | null;
};

export function buildFundPortfolioSnapshot(rows: FundSnapshotHoldingInput[]) {
  const summary = summarizeFundHoldings(rows);
  return {
    totalMarketValue: summary.marketValue,
    totalInvested: summary.investedCost,
    totalProfit: summary.holdingProfit,
    totalProfitRate: summary.returnRate,
    positions: rows.map((holding) => ({
      holdingId: holding.id,
      fundCode: holding.fund_code,
      fundName: holding.fund_name,
      shares: holding.shares == null ? null : Number(holding.shares),
      invested: Number(holding.cost_basis),
      nav: holding.latest_nav == null ? null : Number(holding.latest_nav),
      navDate: holding.nav_date,
      marketValue: holding.market_value == null ? null : Number(holding.market_value),
      profit: holding.cumulative_return == null ? null : Number(holding.cumulative_return),
      profitRate: holding.return_rate == null ? null : Number(holding.return_rate),
    })),
  };
}
