const TRADING_CACHE_TTL_MS = 5 * 60_000;
const CLOSED_CACHE_TTL_MS = 6 * 60 * 60_000;
const MANUAL_REFRESH_COOLDOWN_MS = 30_000;

export function shouldUseMarketCache(args: { fetchedAt: string; forceRefresh: boolean; marketOpen: boolean; now?: Date }): boolean {
  const age = (args.now ?? new Date()).getTime() - new Date(args.fetchedAt).getTime();
  if (!Number.isFinite(age) || age < 0) return false;
  if (args.forceRefresh) return age < MANUAL_REFRESH_COOLDOWN_MS;
  return age <= (args.marketOpen ? TRADING_CACHE_TTL_MS : CLOSED_CACHE_TTL_MS);
}

export function marketFailureResult<T>(cached: T | null, marketName: string, error: string) {
  return cached
    ? { data: cached, source: "cache_stale" as const, message: `${marketName}行情获取失败，展示最近有效数据`, error }
    : { data: null, source: "unavailable" as const, message: `${marketName}行情获取失败，且暂无有效缓存`, error };
}
