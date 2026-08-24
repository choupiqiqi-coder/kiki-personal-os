import Link from "next/link";
import { FinanceNav } from "@/components/finance/finance-nav";
import { MarketSwitch } from "@/components/finance/market-switch";
import { GenerateMarketResearchButton } from "@/components/finance/generate-market-research-button";
import { MarketResearchReport } from "@/components/finance/market-research-report";
import { assertMarketResearchOutput,type MarketResearchOutput } from "@/lib/finance/market-research";
import { getActiveProviderStatus } from "@/server/ai/registry";
import { MARKET_RESEARCH_ARTIFACT_TYPE } from "@/server/ai/market-research-service";
import { requireUser } from "@/server/auth/current-user";
import { createDataAccess } from "@/server/data";
import { formatMarketDateTime } from "@/lib/finance/market-time";
import { getMarketOverview } from "@/server/market";
import { buildMarketResearchContext } from "@/server/market/research/context-builder";
import { generateMarketResearchAction,refreshMarketAction } from "./actions";

const expectedIndices = [["000001", "上证指数"], ["000300", "沪深300"], ["000510", "中证A500"]] as const;

export default async function TodayMarketPage({ searchParams }: { searchParams: Promise<{ refresh?: string;research?:string;researchError?:string }> }) {
  const query = await searchParams;
  const user = await requireUser();
  const data = await createDataAccess();
  const [market, funds,researchState,artifacts] = await Promise.all([getMarketOverview(user.id), data.funds.list(user.id),buildMarketResearchContext(user.id),data.aiArtifacts.listByType(user.id,MARKET_RESEARCH_ARTIFACT_TYPE)]);
  const overview = market.data;
  const fundTags = funds.map((item) => item.fund_type).filter((item): item is string => Boolean(item));
  const cost = funds.reduce((sum, item) => sum + Number(item.cost_basis), 0);
  const valued = funds.length > 0 && funds.every((item) => item.market_value != null);
  const amount = valued ? funds.reduce((sum, item) => sum + Number(item.market_value), 0) : null;
  const totalReturn = amount == null ? null : amount - cost;
  const confirmedRelations = overview ? funds.map((fund) => { const target = overview.indices.find((index) => fund.benchmark?.includes(index.name)); return target ? { fund, target } : null; }).filter((item): item is NonNullable<typeof item> => Boolean(item)) : [];
  const activeAi=getActiveProviderStatus("market_research"),latestArtifact=artifacts[0]??null;
  const latestRun=latestArtifact?.run_id?await data.aiArtifacts.getRun(user.id,latestArtifact.run_id) as Record<string,unknown>|null:null;
  const researchStale=Boolean(latestRun?.input_hash&&latestRun.input_hash!==researchState.contextHash);
  let researchReport:MarketResearchOutput|null=null;if(latestArtifact){try{assertMarketResearchOutput(latestArtifact.content,researchState.context);researchReport=latestArtifact.content;}catch{researchReport=null;}}
  const showingStale = query.refresh === "stale" || market.source === "cache_stale";
  const statusMessage = showingStale ? "当前行情获取失败，展示最近一次有效数据" : market.message;

  return <main className="mx-auto max-w-3xl px-4 py-6 pb-28"><div className="flex items-end justify-between gap-4"><div><p className="text-sm font-semibold text-primary">MARKET TODAY</p><h1 className="mt-2 text-3xl font-semibold">今日市场</h1></div><form action={refreshMarketAction}><button className="min-h-11 rounded-full bg-primary px-4 text-sm font-semibold text-white">刷新行情</button></form></div><FinanceNav /><MarketSwitch active="a" />
    {!overview ? <section className="mt-6 rounded-[2rem] bg-[#173f31] p-6 text-white"><p className="text-sm text-emerald-100">A 股市场概览</p><h2 className="mt-2 text-2xl font-semibold">{market.message}</h2><p className="mt-3 text-sm leading-6 text-emerald-100">当前不会显示 Mock、随机或硬编码旧行情。真实行情获取成功后将写入 Supabase；临时失败时优先展示最后一次有效快照。</p></section> : null}
    {overview ? <section className={`mt-6 rounded-3xl p-4 text-sm ${showingStale ? "bg-[#fff1dc] text-[#795a2d]" : "bg-emerald-50 text-emerald-900"}`}><p className="font-semibold">{statusMessage}</p><p className="mt-1">数据源：{overview.source} · 数据基准：{formatTime(overview.dataTime)} · 获取时间：{formatTime(overview.fetchedAt)}</p></section> : null}
    <section className="mt-5 rounded-3xl border border-border bg-surface p-5"><div className="flex items-end justify-between"><div><p className="text-sm text-primary">市场参考行情</p><h2 className="mt-1 text-xl font-semibold">三个核心指数</h2></div><p className="text-xs text-muted-foreground">{overview ? `行情时间 ${formatTime(overview.dataTime)}` : "等待数据"}</p></div><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">{expectedIndices.map(([code, name]) => { const item = overview?.indices.find((index) => index.code === code); return <div key={code} className="rounded-2xl bg-surface-muted p-3"><p className="text-xs text-muted-foreground">{name}</p><p className="mt-2 font-semibold">{item ? item.value.toLocaleString("zh-CN") : "—"}</p><p className="mt-1 text-xs">{item ? formatPercent(item.changePercent) : "待数据"}</p></div>; })}</div></section>
    <section className="mt-4 rounded-3xl bg-[#eee5d5] p-5"><p className="text-sm text-[#795a2d]">与我的基金关联</p><h2 className="mt-1 text-xl font-semibold">只显示可验证关系</h2>{confirmedRelations.length ? <div className="mt-4 space-y-3">{confirmedRelations.map(({ fund, target }) => <p key={fund.id} className="text-sm leading-6">{fund.fund_name} 的业绩基准包含 {target.name}，该指数今日 {formatPercent(target.changePercent)}。</p>)}</div> : <p className="mt-3 text-sm leading-6 text-[#745f42]">关联未知。尚无基金基准或真实持仓能可靠对应到今日指数/板块，系统不做推测。</p>}<p className="mt-3 text-xs text-[#745f42]">基金类型与基准来自公开基金资料；这不代表基金实时持仓穿透结果。</p></section>
    <section className="mt-4 rounded-3xl border border-border bg-surface p-5"><div className="flex items-center justify-between"><div><p className="text-sm text-primary">我的基金摘要</p><h2 className="mt-1 text-xl font-semibold">{funds.length} 只基金</h2></div><Link href="/finance" className="rounded-full bg-surface-muted px-4 py-2 text-sm text-primary">查看我的基金</Link></div><div className="mt-4 grid grid-cols-2 gap-3"><NumberCard label="当前总金额" value={amount == null ? "待净值" : amount.toFixed(2)} /><NumberCard label="当前总收益" value={totalReturn == null ? "待净值" : totalReturn.toFixed(2)} /></div><p className="mt-3 text-xs text-muted-foreground">基金类型：{fundTags.length ? [...new Set(fundTags)].join(" · ") : "待真实资料"}</p></section>
    <section className="mt-4 rounded-3xl border border-border bg-surface p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-sm text-primary">每日财经简报</p><h2 className="mt-1 text-xl font-semibold">今日市场解读</h2></div><span className="rounded-full bg-surface-muted px-3 py-1 text-xs text-muted-foreground">{researchState.contextHash.slice(0,8)}</span></div><p className="mt-3 text-sm leading-6 text-muted-foreground">结合可靠市场事实，用清晰的日常语言解释今天发生了什么、值得注意什么，以及和我的基金可能有什么关系。页面打开不会自动调用 AI。</p>{query.research==="failed"?<p className="mt-3 rounded-2xl bg-red-50 p-3 text-sm text-red-700">生成失败：{query.researchError??"请稍后重试"}</p>:null}{query.research==="reused"?<p className="mt-3 rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-800">Context 未变化，已复用当日报告，未重复调用 AI。</p>:null}{query.research==="generated"?<p className="mt-3 rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-800">今日市场解读已生成并保存。</p>:null}{researchStale?<p className="mt-3 rounded-2xl bg-amber-50 p-3 text-sm text-amber-800">市场数据已更新，可更新解读。系统不会自动消耗 API。</p>:null}<dl className="mt-4 grid grid-cols-2 gap-3 text-xs text-muted-foreground"><Status label="市场宽度样本" value={researchState.context.marketStructure.breadth?`${researchState.context.marketStructure.breadth.method.sampleSize} 只`:"暂不可用"}/><Status label="可信新闻" value={`${researchState.context.marketNews.length} 条`}/><Status label="Research Snapshot" value={researchState.source==="cache_stale"?"最近有效数据":researchState.source==="collector"?"刚刚采集":"有效缓存"}/><Status label="AI Provider" value={activeAi.configured?`${activeAi.label} · ${activeAi.model}`:"未配置"}/></dl><form action={generateMarketResearchAction} className="mt-5"><GenerateMarketResearchButton disabled={!activeAi.configured||!overview} hasArtifact={Boolean(latestArtifact)} stale={researchStale}/></form><p className="mt-3 text-center text-xs text-muted-foreground">AI 分析仅供参考，不构成投资建议。</p></section>
    {latestArtifact&&researchReport?<MarketResearchReport artifact={latestArtifact} content={researchReport} run={latestRun}/>:latestArtifact?<div className="mt-4 rounded-3xl bg-red-50 p-5 text-sm text-red-700">最近报告未通过 Schema / Fact-ID 校验，已停止展示；市场事实未受影响。</div>:null}
  </main>;
}

function NumberCard({ label, value }: { label: string; value: string | number }) { return <div className="rounded-2xl bg-surface-muted p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-semibold">{value}</p></div>; }
function formatPercent(value: number) { return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`; }
function formatTime(value: string) { return formatMarketDateTime(value, "Asia/Shanghai", "中国时间"); }
function Status({label,value}:{label:string;value:string}){return <div className="rounded-2xl bg-surface-muted p-3"><dt>{label}</dt><dd className="mt-1 font-medium text-foreground">{value}</dd></div>}
