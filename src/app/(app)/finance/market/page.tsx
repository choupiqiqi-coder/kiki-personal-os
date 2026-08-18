import Link from "next/link";
import { FinanceNav } from "@/components/finance/finance-nav";
import { MarketSwitch } from "@/components/finance/market-switch";
import { providerStatus } from "@/server/ai/config";
import { requireUser } from "@/server/auth/current-user";
import { createDataAccess } from "@/server/data";
import { calculateMarketMood, getMarketOverview } from "@/server/market";
import { refreshMarketAction } from "./actions";

const expectedIndices = [["000001", "上证指数"], ["399001", "深证成指"], ["399006", "创业板指"], ["000300", "沪深300"], ["000510", "中证A500"]] as const;
const moodLabel = { strong: "偏强", sideways: "震荡", weak: "偏弱" } as const;

export default async function TodayMarketPage({ searchParams }: { searchParams: Promise<{ refresh?: string }> }) {
  const query = await searchParams;
  const user = await requireUser();
  const data = await createDataAccess();
  const [market, funds] = await Promise.all([getMarketOverview(user.id), data.funds.list(user.id)]);
  const overview = market.data;
  const fundTags = funds.map((item) => item.fund_type).filter((item): item is string => Boolean(item));
  const leading = overview ? [...overview.sectors].sort((a, b) => b.changePercent - a.changePercent).slice(0, 5) : [];
  const lagging = overview ? [...overview.sectors].sort((a, b) => a.changePercent - b.changePercent).slice(0, 5) : [];
  const mood = overview ? calculateMarketMood(overview.breadth) : null;
  const cost = funds.reduce((sum, item) => sum + Number(item.cost_basis), 0);
  const valued = funds.length > 0 && funds.every((item) => item.market_value != null);
  const amount = valued ? funds.reduce((sum, item) => sum + Number(item.market_value), 0) : null;
  const totalReturn = amount == null ? null : amount - cost;
  const confirmedRelations = overview ? funds.map((fund) => { const target = overview.indices.find((index) => fund.benchmark?.includes(index.name)); return target ? { fund, target } : null; }).filter((item): item is NonNullable<typeof item> => Boolean(item)) : [];
  const aiConfigured = providerStatus().some((item) => item.active && item.configured);
  const showingStale = query.refresh === "stale" || market.source === "cache_stale";
  const statusMessage = showingStale ? "当前行情获取失败，展示最近一次有效数据" : market.message;

  return <main className="mx-auto max-w-3xl px-4 py-6 pb-28"><div className="flex items-end justify-between gap-4"><div><p className="text-sm font-semibold text-primary">MARKET TODAY</p><h1 className="mt-2 text-3xl font-semibold">今日市场</h1></div><form action={refreshMarketAction}><button className="min-h-11 rounded-full bg-primary px-4 text-sm font-semibold text-white">刷新行情</button></form></div><FinanceNav /><MarketSwitch active="a" />
    {!overview ? <section className="mt-6 rounded-[2rem] bg-[#173f31] p-6 text-white"><p className="text-sm text-emerald-100">A 股市场概览</p><h2 className="mt-2 text-2xl font-semibold">{market.message}</h2><p className="mt-3 text-sm leading-6 text-emerald-100">当前不会显示 Mock、随机或硬编码旧行情。真实行情获取成功后将写入 Supabase；临时失败时优先展示最后一次有效快照。</p></section> : null}
    {overview ? <section className={`mt-6 rounded-3xl p-4 text-sm ${showingStale ? "bg-[#fff1dc] text-[#795a2d]" : "bg-emerald-50 text-emerald-900"}`}><p className="font-semibold">{statusMessage}</p><p className="mt-1">数据源：{overview.source} · 数据基准：{formatTime(overview.dataTime)} · 获取时间：{formatTime(overview.fetchedAt)}</p></section> : null}
    <section className="mt-5 rounded-3xl border border-border bg-surface p-5"><div className="flex items-end justify-between"><div><p className="text-sm text-primary">市场概览</p><h2 className="mt-1 text-xl font-semibold">五个核心指数</h2></div><p className="text-xs text-muted-foreground">{overview ? `更新 ${formatTime(overview.dataTime)}` : "等待数据"}</p></div><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">{expectedIndices.map(([code, name]) => { const item = overview?.indices.find((index) => index.code === code || index.name === name); return <div key={code} className="rounded-2xl bg-surface-muted p-3"><p className="text-xs text-muted-foreground">{name}</p><p className="mt-2 font-semibold">{item ? item.value.toLocaleString("zh-CN") : "—"}</p><p className="mt-1 text-xs">{item ? formatPercent(item.changePercent) : "待数据"}</p></div>; })}</div></section>
    <section className="mt-4 rounded-3xl border border-border bg-surface p-5"><div className="flex items-center justify-between"><h2 className="font-semibold">市场情绪</h2><span className="rounded-full bg-surface-muted px-3 py-1 text-sm font-medium">{mood ? moodLabel[mood] : "待判断"}</span></div>{overview ? <><div className="mt-4 grid grid-cols-3 gap-2 text-center"><NumberCard label="上涨" value={overview.breadth.advancing} /><NumberCard label="下跌" value={overview.breadth.declining} /><NumberCard label="平盘" value={overview.breadth.unchanged} /></div><p className="mt-4 text-sm">两市成交额 {formatTurnover(overview.turnover.amount)}{overview.turnover.previousAmount == null ? " · 无上一交易日可比数据" : ` · 较上一交易日 ${formatPercent((overview.turnover.amount / overview.turnover.previousAmount - 1) * 100)}`}</p><p className="mt-1 text-xs text-muted-foreground">更新 {formatTime(overview.breadth.dataTime)}</p></> : <p className="mt-4 text-sm text-muted-foreground">上涨家数、下跌家数和平盘家数将在真实数据到达后计算市场状态。</p>}</section>
    <div className="mt-4 grid gap-4 sm:grid-cols-2"><SectorList title="领涨板块 Top 5" rows={leading} /><SectorList title="领跌板块 Top 5" rows={lagging} /></div>
    <section className="mt-4 rounded-3xl bg-[#eee5d5] p-5"><p className="text-sm text-[#795a2d]">与我的基金关联</p><h2 className="mt-1 text-xl font-semibold">只显示可验证关系</h2>{confirmedRelations.length ? <div className="mt-4 space-y-3">{confirmedRelations.map(({ fund, target }) => <p key={fund.id} className="text-sm leading-6">{fund.fund_name} 的业绩基准包含 {target.name}，该指数今日 {formatPercent(target.changePercent)}。</p>)}</div> : <p className="mt-3 text-sm leading-6 text-[#745f42]">关联未知。尚无基金基准或真实持仓能可靠对应到今日指数/板块，系统不做推测。</p>}<p className="mt-3 text-xs text-[#745f42]">基金类型与基准来自公开基金资料；这不代表基金实时持仓穿透结果。</p></section>
    <section className="mt-4 rounded-3xl border border-border bg-surface p-5"><div className="flex items-center justify-between"><div><p className="text-sm text-primary">我的基金摘要</p><h2 className="mt-1 text-xl font-semibold">{funds.length} 只基金</h2></div><Link href="/finance" className="rounded-full bg-surface-muted px-4 py-2 text-sm text-primary">查看我的基金</Link></div><div className="mt-4 grid grid-cols-2 gap-3"><NumberCard label="当前总金额" value={amount == null ? "待净值" : amount.toFixed(2)} /><NumberCard label="当前总收益" value={totalReturn == null ? "待净值" : totalReturn.toFixed(2)} /></div><p className="mt-3 text-xs text-muted-foreground">基金类型：{fundTags.length ? [...new Set(fundTags)].join(" · ") : "待真实资料"}</p></section>
    <section className="mt-4 rounded-3xl border border-border bg-surface p-5"><p className="text-sm text-primary">AI 市场解读</p><h2 className="mt-1 text-xl font-semibold">把今日变化讲清楚</h2><button disabled className="mt-4 w-full rounded-2xl bg-surface-muted p-4 text-sm text-muted-foreground">{!overview ? "等待有效市场数据" : !aiConfigured ? "AI Provider 未配置" : "AI 解读入口已准备"}</button><p className="mt-3 text-center text-xs text-muted-foreground">AI 分析仅供参考，不构成投资建议。</p></section>
  </main>;
}

function NumberCard({ label, value }: { label: string; value: string | number }) { return <div className="rounded-2xl bg-surface-muted p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-semibold">{value}</p></div>; }
function SectorList({ title, rows }: { title: string; rows: Array<{ name: string; changePercent: number; dataTime: string }> }) { return <section className="rounded-3xl border border-border bg-surface p-5"><h2 className="font-semibold">{title}</h2>{rows.length ? <><div>{rows.map((item) => <div key={item.name} className="mt-3 flex justify-between text-sm"><span>{item.name}</span><span>{formatPercent(item.changePercent)}</span></div>)}</div><p className="mt-3 text-xs text-muted-foreground">更新 {formatTime(rows[0].dataTime)}</p></> : <p className="mt-4 text-sm text-muted-foreground">市场数据源待配置</p>}</section>; }
function formatPercent(value: number) { return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`; }
function formatTurnover(value: number) { return `${(value / 100_000_000).toFixed(0)} 亿元`; }
function formatTime(value: string) { return new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value)); }
