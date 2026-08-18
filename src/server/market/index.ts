import "server-only";
import { createClient } from "@/lib/supabase/server";
export { calculateMarketMood } from "@/lib/finance/market-associations";
import { getMarketProviderStatus } from "./config";
import type { MajorIndex, MarketBreadth, MarketDataProvider, MarketOverview, MarketOverviewResult, MarketTurnover, SectorPerformance, USMarketOverview, USMarketOverviewResult } from "./types";
import { AKShareMarketDataProvider } from "./providers/akshare";

const SNAPSHOT_TYPE = "a_share_overview";
const US_SNAPSHOT_TYPE = "us_market_overview";
const CACHE_TTL_MS = Number(process.env.MARKET_CACHE_TTL_MINUTES ?? 30) * 60 * 1000;

export function getMarketDataProvider(): MarketDataProvider | null {
  const status = getMarketProviderStatus();
  if (!status.configured) return null;
  if (status.provider === "akshare") return new AKShareMarketDataProvider(process.env.MARKET_DATA_BASE_URL!.trim(), process.env.MARKET_DATA_API_KEY!.trim());
  throw new Error(`未安装 Market Provider：${status.provider}`);
}

function isOverview(value: unknown): value is MarketOverview {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<MarketOverview>;
  return Array.isArray(item.indices) && item.indices.length === 5 && Array.isArray(item.sectors) && Boolean(item.breadth && item.turnover && item.provider && item.source && item.dataTime && item.fetchedAt);
}
function isUSOverview(value:unknown):value is USMarketOverview{if(!value||typeof value!=="object")return false;const item=value as Partial<USMarketOverview>;return Array.isArray(item.indices)&&item.indices.length===4&&Boolean(item.provider&&item.source&&item.marketTime&&item.fetchedAt&&item.session&&item.sessionMessage)}

export async function getMarketOverview(userId: string, options: { forceRefresh?: boolean } = {}): Promise<MarketOverviewResult> {
  const client = await createClient();
  const { data: cached } = await client.from("finance_market_snapshots").select("payload,provider,data_time,fetched_at").eq("user_id", userId).eq("snapshot_type", SNAPSHOT_TYPE).order("fetched_at", { ascending: false }).limit(1).maybeSingle();
  const cachedOverview = cached && isOverview(cached.payload) ? cached.payload : null;
  if (!options.forceRefresh && cachedOverview && Date.now() - new Date(cached!.fetched_at).getTime() <= CACHE_TTL_MS) {
    return { data: cachedOverview, source: "cache", message: "已读取有效市场快照" };
  }
  const provider = getMarketDataProvider();
  if (!provider) return cachedOverview ? { data: cachedOverview, source: "cache_stale", message: "市场数据源待配置，展示最近一次有效数据" } : { data: null, source: "unavailable", message: "市场数据源待配置" };
  try {
    const overview = await provider.getMarketOverview();
    const { error } = await client.from("finance_market_snapshots").insert({ user_id: userId, provider: overview.provider, snapshot_type: SNAPSHOT_TYPE, data_time: overview.dataTime, fetched_at: overview.fetchedAt, payload: overview });
    if (error) throw new Error(`保存市场快照失败：${error.message}`);
    return { data: overview, source: "provider", message: "AKShare 市场数据已更新" };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "未知错误";
    if (cachedOverview) return { data: cachedOverview, source: "cache_stale", message: "当前行情获取失败，展示最近一次有效数据", error: detail };
    return { data: null, source: "unavailable", message: "当前行情获取失败，且暂无有效缓存", error: detail };
  }
}

export async function getMajorIndices(userId: string): Promise<MajorIndex[] | null> { return (await getMarketOverview(userId)).data?.indices ?? null; }
export async function getMarketBreadth(userId: string): Promise<MarketBreadth | null> { return (await getMarketOverview(userId)).data?.breadth ?? null; }
export async function getMarketTurnover(userId: string): Promise<MarketTurnover | null> { return (await getMarketOverview(userId)).data?.turnover ?? null; }
export async function getSectorPerformance(userId: string): Promise<SectorPerformance[] | null> { return (await getMarketOverview(userId)).data?.sectors ?? null; }
export async function getUSMarketOverview(userId:string,options:{forceRefresh?:boolean}={}):Promise<USMarketOverviewResult>{const client=await createClient();const{data:cached}=await client.from("finance_market_snapshots").select("payload,provider,data_time,fetched_at").eq("user_id",userId).eq("snapshot_type",US_SNAPSHOT_TYPE).order("fetched_at",{ascending:false}).limit(1).maybeSingle();const cachedOverview=cached&&isUSOverview(cached.payload)?cached.payload:null;if(!options.forceRefresh&&cachedOverview&&Date.now()-new Date(cached!.fetched_at).getTime()<=CACHE_TTL_MS)return{data:cachedOverview,source:"cache",message:"已读取有效美股市场快照"};const provider=getMarketDataProvider();if(!provider)return cachedOverview?{data:cachedOverview,source:"cache_stale",message:"市场数据源待配置，展示最近一次有效美股数据"}:{data:null,source:"unavailable",message:"美股市场数据源待配置"};try{const overview=await provider.getUSMarketOverview();const{error}=await client.from("finance_market_snapshots").insert({user_id:userId,provider:overview.provider,snapshot_type:US_SNAPSHOT_TYPE,data_time:overview.marketTime,fetched_at:overview.fetchedAt,payload:overview});if(error)throw new Error(`保存美股市场快照失败：${error.message}`);return{data:overview,source:"provider",message:"AKShare 美股数据已更新"}}catch(error){const detail=error instanceof Error?error.message:"未知错误";return cachedOverview?{data:cachedOverview,source:"cache_stale",message:"当前美股行情获取失败，展示最近一次有效数据",error:detail}:{data:null,source:"unavailable",message:"当前美股行情获取失败，且暂无有效缓存",error:detail}}}
export async function getUSMajorIndices(userId:string){return(await getUSMarketOverview(userId)).data?.indices??null}
export async function getCachedMarketOverview(userId:string):Promise<MarketOverviewResult>{const client=await createClient();const{data}=await client.from("finance_market_snapshots").select("payload").eq("user_id",userId).eq("snapshot_type",SNAPSHOT_TYPE).order("fetched_at",{ascending:false}).limit(1).maybeSingle();return isOverview(data?.payload)?{data:data.payload,source:"cache",message:"Dashboard 读取最近市场快照"}:{data:null,source:"unavailable",message:"市场数据待更新"}}
export async function getCachedUSMarketOverview(userId:string):Promise<USMarketOverviewResult>{const client=await createClient();const{data}=await client.from("finance_market_snapshots").select("payload").eq("user_id",userId).eq("snapshot_type",US_SNAPSHOT_TYPE).order("fetched_at",{ascending:false}).limit(1).maybeSingle();return isUSOverview(data?.payload)?{data:data.payload,source:"cache",message:"Dashboard 读取最近美股快照"}:{data:null,source:"unavailable",message:"美股数据待更新"}}
