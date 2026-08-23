import { FinanceNav } from "@/components/finance/finance-nav";
import { FinanceAnalysisReport } from "@/components/finance/finance-analysis-report";
import { GenerateFinanceAnalysisButton } from "@/components/finance/generate-finance-analysis-button";
import { assertFinanceAnalysisOutput,type FinanceAnalysisOutput } from "@/lib/finance/analysis-output";
import { formatMarketDateTime } from "@/lib/finance/market-time";
import { getActiveProviderStatus } from "@/server/ai/registry";
import { FINANCE_ANALYSIS_ARTIFACT_TYPE } from "@/server/ai/finance-service";
import { requireUser } from "@/server/auth/current-user";
import { createDataAccess } from "@/server/data";
import { buildFinanceAnalysisContext } from "@/server/finance/analysis-context";
import { generateFinanceAnalysisAction } from "./actions";

export default async function AnalysisPage({searchParams}:{searchParams:Promise<{error?:string;generated?:string;reused?:string}>}){
  const query=await searchParams;const user=await requireUser();const data=await createDataAccess();
  const [{context,contextHash},artifacts]=await Promise.all([buildFinanceAnalysisContext(user.id),data.aiArtifacts.listByType(user.id,FINANCE_ANALYSIS_ARTIFACT_TYPE)]);
  const latest=artifacts[0]??null;const run=latest?.run_id?await data.aiArtifacts.getRun(user.id,latest.run_id):null;const active=getActiveProviderStatus("finance_analysis");
  let report:FinanceAnalysisOutput|null=null;if(latest){try{assertFinanceAnalysisOutput(latest.content);report=latest.content;}catch{report=null;}}
  const qdii=context.dataFreshness.fundNavDates.filter(item=>item.isQdii);
  return <main className="mx-auto max-w-3xl px-4 py-6 pb-28"><p className="text-sm font-semibold text-primary">AI FINANCE ANALYSIS</p><h1 className="mt-2 text-3xl font-semibold">AI 分析</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">综合市场、我的基金和真实收益快照，解释这些变化与你的持仓有什么关系。</p><FinanceNav/>
    {query.error?<div className="mt-5 rounded-2xl bg-red-50 p-4 text-sm text-red-700">生成失败：{query.error}</div>:null}{query.reused?<div className="mt-5 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800">事实数据未变化，已复用最近一次成功分析，未重复消耗 API。</div>:null}{query.generated?<div className="mt-5 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800">分析已根据当前事实生成并保存。</div>:null}
    <section className="mt-5 rounded-3xl border border-border bg-surface p-5"><div className="flex items-center justify-between gap-3"><div><p className="text-sm text-primary">分析前的数据状态</p><h2 className="mt-1 text-xl font-semibold">事实 Context 已就绪</h2></div><span className="rounded-full bg-surface-muted px-3 py-1 text-xs text-muted-foreground">{contextHash.slice(0,8)}</span></div><dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 text-sm"><Status label="A 股行情时间" value={formatMarketTime(context.dataFreshness.chinaMarketTime,"Asia/Shanghai","中国时间")}/><Status label="美股行情时间" value={formatMarketTime(context.dataFreshness.usMarketTime,"America/New_York","纽约时间")}/><Status label="基金持仓" value={`${context.fundFacts.length} 只 · 正式 NAV`}/><Status label="组合历史" value={`${context.trendFacts.snapshotDays} 天${context.trendFacts.insufficientHistory?" · 历史不足":""}`}/></dl>{qdii.length?<p className="mt-5 border-t border-border pt-4 text-xs leading-5 text-muted-foreground">QDII 正式净值：{qdii.map(item=>`${item.fundName} ${item.navDate??"待更新"}`).join("；")}</p>:null}{context.limitations.length?<p className="mt-2 text-xs leading-5 text-amber-700">当前限制：{context.limitations.join("；")}</p>:null}</section>
    {active.configured?<div className="mt-4 rounded-3xl bg-emerald-50 p-5 text-sm text-emerald-900"><strong>AI Provider 已就绪</strong><p className="mt-1 leading-6">{active.label} · {active.model}</p></div>:null}
    {!active?.configured?<div className="mt-4 rounded-3xl bg-amber-50 p-5 text-sm text-amber-800"><strong>AI Provider 尚未配置</strong><p className="mt-1 leading-6">事实状态仍可正常查看；只暂停生成分析，不会使用 Mock 内容。</p></div>:null}
    <form action={generateFinanceAnalysisAction} className="mt-5"><GenerateFinanceAnalysisButton disabled={!active?.configured} hasArtifact={Boolean(latest)}/></form>
    {latest&&report?<FinanceAnalysisReport artifact={latest} content={report} run={run as Record<string,unknown>|null}/>:latest?<div className="mt-6 rounded-3xl bg-red-50 p-5 text-sm text-red-700">最近报告未通过结构校验，已停止展示；事实数据未受影响。</div>:<div className="mt-6 rounded-3xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">页面不会自动调用 AI。配置有效 Provider 后，由你主动生成第一份分析。</div>}
    {artifacts.length>1?<section className="mt-6"><h2 className="font-semibold">历史版本</h2><div className="mt-3 space-y-2">{artifacts.map(item=><div key={item.id} className="rounded-2xl bg-surface p-4 text-sm">v{item.version} · {new Date(item.generated_at).toLocaleString("zh-CN")} · {item.summary}</div>)}</div></section>:null}
  </main>;
}
function Status({label,value}:{label:string;value:string}){return <div><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 break-words font-medium">{value}</dd></div>}
function formatMarketTime(value:string|null,timeZone:"Asia/Shanghai"|"America/New_York",suffix:string){return value?formatMarketDateTime(value,timeZone,suffix):"暂不可用";}
