import "server-only";
import { createClient } from "@/lib/supabase/server";
import { marketFailureResult, shouldUseMarketCache } from "./cache-policy";
import { CompositeChinaMarketProvider, CompositeUSMarketProvider } from "./providers/composite";
import { EastmoneyProvider } from "./providers/eastmoney";
import { CHINA_INDEX_NAMES, US_INDEX_NAMES, validateChinaIndices, validateUSIndices } from "./providers/shared";
import { TencentMarketProvider } from "./providers/tencent";
import type { ChinaMarketProvider, MajorIndex, MarketBreadth, MarketDataProvider, MarketOverview, MarketOverviewResult, MarketTurnover, SectorPerformance, USIndexMarketProvider, USMarketOverview, USMarketOverviewResult } from "./types";

export { calculateMarketMood } from "@/lib/finance/market-associations";

const CHINA_SNAPSHOT_TYPE = "a_share_overview";
const US_SNAPSHOT_TYPE = "us_market_overview";
type SnapshotRow = { payload: unknown; provider: string; data_time: string; fetched_at: string };

/** Legacy fund adapter. The six-index market path no longer uses this provider. */
export function getMarketDataProvider(): MarketDataProvider | null { return null; }

export function getChinaMarketProvider(): ChinaMarketProvider {
  return new CompositeChinaMarketProvider(new EastmoneyProvider(), new TencentMarketProvider());
}
export function getUSIndexMarketProvider(): USIndexMarketProvider {
  return new CompositeUSMarketProvider(new TencentMarketProvider());
}

function normalizeChinaOverview(value: unknown): MarketOverview | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Partial<MarketOverview>;
  if (!Array.isArray(item.indices) || !item.provider || !item.source || !item.dataTime || !item.fetchedAt) return null;
  const indices = item.indices.filter((index) => CHINA_INDEX_NAMES.has(index.code));
  try {
    validateChinaIndices(indices);
    return { ...item, indices, sectors: [], breadth: undefined, turnover: undefined } as MarketOverview;
  } catch { return null; }
}
function normalizeUSOverview(value: unknown): USMarketOverview | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Partial<USMarketOverview>;
  if (!Array.isArray(item.indices) || !item.provider || !item.source || !item.marketTime || !item.fetchedAt || !item.session || !item.sessionMessage) return null;
  const indices = item.indices.filter((index) => US_INDEX_NAMES.has(index.code));
  try {
    validateUSIndices(indices);
    return { ...item, indices } as USMarketOverview;
  } catch { return null; }
}

function marketClock(timeZone: string, now = new Date()) {
  return Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone, weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(now).map((part) => [part.type, part.value]));
}
function chinaMarketIsOpen(now = new Date()): boolean {
  const parts = marketClock("Asia/Shanghai", now);
  if (parts.weekday === "Sat" || parts.weekday === "Sun") return false;
  const minutes = Number(parts.hour) * 60 + Number(parts.minute);
  return (minutes >= 570 && minutes <= 690) || (minutes >= 780 && minutes <= 900);
}
function usMarketIsOpen(now = new Date()): boolean {
  const parts = marketClock("America/New_York", now);
  if (parts.weekday === "Sat" || parts.weekday === "Sun") return false;
  const minutes = Number(parts.hour) * 60 + Number(parts.minute);
  return minutes >= 570 && minutes < 960;
}

async function latestSnapshot(userId: string, snapshotType: string): Promise<SnapshotRow | null> {
  const client = await createClient();
  const { data } = await client.from("finance_market_snapshots").select("payload,provider,data_time,fetched_at")
    .eq("user_id", userId).eq("snapshot_type", snapshotType).order("fetched_at", { ascending: false }).limit(1).maybeSingle();
  return data as SnapshotRow | null;
}
async function saveSnapshot(userId: string, snapshotType: string, provider: string, dataTime: string, fetchedAt: string, payload: unknown) {
  const client = await createClient();
  const { error } = await client.from("finance_market_snapshots").insert({
    user_id: userId, provider, snapshot_type: snapshotType, data_time: dataTime, fetched_at: fetchedAt, payload,
  });
  if (error) throw new Error(`保存市场快照失败：${error.message}`);
}

export async function getMarketOverview(userId: string, options: { forceRefresh?: boolean } = {}): Promise<MarketOverviewResult> {
  const cached = await latestSnapshot(userId, CHINA_SNAPSHOT_TYPE);
  const cachedOverview = normalizeChinaOverview(cached?.payload);
  const forceRefresh = options.forceRefresh === true;
  if (cachedOverview && cached && shouldUseMarketCache({ fetchedAt: cached.fetched_at, forceRefresh, marketOpen: chinaMarketIsOpen() })) {
    return { data: cachedOverview, source: "cache", message: forceRefresh ? "刷新间隔需至少 30 秒，已显示最近有效数据" : "已读取有效 A 股市场快照" };
  }
  try {
    const overview = await getChinaMarketProvider().getMarketOverview();
    await saveSnapshot(userId, CHINA_SNAPSHOT_TYPE, overview.provider, overview.dataTime, overview.fetchedAt, overview);
    return { data: overview, source: "provider", message: `${overview.source}已更新` };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "未知错误";
    return marketFailureResult(cachedOverview, "A 股", detail);
  }
}

export async function getUSMarketOverview(userId: string, options: { forceRefresh?: boolean } = {}): Promise<USMarketOverviewResult> {
  const cached = await latestSnapshot(userId, US_SNAPSHOT_TYPE);
  const cachedOverview = normalizeUSOverview(cached?.payload);
  const forceRefresh = options.forceRefresh === true;
  if (cachedOverview && cached && shouldUseMarketCache({ fetchedAt: cached.fetched_at, forceRefresh, marketOpen: usMarketIsOpen() })) {
    return { data: cachedOverview, source: "cache", message: forceRefresh ? "刷新间隔需至少 30 秒，已显示最近有效数据" : "已读取有效美股市场快照" };
  }
  try {
    const overview = await getUSIndexMarketProvider().getUSMarketOverview();
    await saveSnapshot(userId, US_SNAPSHOT_TYPE, overview.provider, overview.marketTime, overview.fetchedAt, overview);
    return { data: overview, source: "provider", message: `${overview.source}已更新` };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "未知错误";
    return marketFailureResult(cachedOverview, "美股", detail);
  }
}

export async function getMajorIndices(userId: string): Promise<MajorIndex[] | null> { return (await getMarketOverview(userId)).data?.indices ?? null; }
export async function getMarketBreadth(userId: string): Promise<MarketBreadth | null> { return (await getMarketOverview(userId)).data?.breadth ?? null; }
export async function getMarketTurnover(userId: string): Promise<MarketTurnover | null> { return (await getMarketOverview(userId)).data?.turnover ?? null; }
export async function getSectorPerformance(userId: string): Promise<SectorPerformance[] | null> { return (await getMarketOverview(userId)).data?.sectors ?? null; }
export async function getUSMajorIndices(userId: string) { return (await getUSMarketOverview(userId)).data?.indices ?? null; }
export async function getCachedMarketOverview(userId: string): Promise<MarketOverviewResult> {
  const overview = normalizeChinaOverview((await latestSnapshot(userId, CHINA_SNAPSHOT_TYPE))?.payload);
  return overview ? { data: overview, source: "cache", message: "Dashboard 读取最近 A 股市场快照" } : { data: null, source: "unavailable", message: "A 股市场数据待更新" };
}
export async function getCachedUSMarketOverview(userId: string): Promise<USMarketOverviewResult> {
  const overview = normalizeUSOverview((await latestSnapshot(userId, US_SNAPSHOT_TYPE))?.payload);
  return overview ? { data: overview, source: "cache", message: "Dashboard 读取最近美股市场快照" } : { data: null, source: "unavailable", message: "美股市场数据待更新" };
}
