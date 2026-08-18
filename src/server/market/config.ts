import "server-only";
export type MarketProviderStatus = { provider: string | null; configured: boolean; message: string };
export function getMarketProviderStatus(): MarketProviderStatus {
  const provider = process.env.MARKET_DATA_PROVIDER?.trim().toLowerCase() || null;
  if (!provider) return { provider: null, configured: false, message: "行情未配置" };
  const configured = Boolean(process.env.MARKET_DATA_API_KEY?.trim() && process.env.MARKET_DATA_BASE_URL?.trim());
  return { provider, configured, message: configured ? `${provider === "akshare" ? "AKShare" : provider} 已配置` : "行情 Provider 配置不完整" };
}
