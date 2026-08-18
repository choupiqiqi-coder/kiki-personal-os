export type FundValuationInput = { shares: number | null; manualHoldingAmount: number | null; costBasis: number; latestNav: number | null };
export function calculateFundValuation(input: FundValuationInput) {
  const marketValue = input.shares != null && input.latestNav != null ? input.shares * input.latestNav : input.manualHoldingAmount;
  const cumulativeReturn = marketValue == null ? null : marketValue - input.costBasis;
  const returnRate = cumulativeReturn == null || input.costBasis === 0 ? null : cumulativeReturn / input.costBasis;
  return { marketValue, cumulativeReturn, returnRate };
}
