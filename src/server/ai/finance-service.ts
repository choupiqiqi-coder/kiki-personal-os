import "server-only";
import { assertFinanceAnalysisOutput } from "@/lib/finance/analysis-output";
import { buildFinanceAnalysisContext } from "@/server/finance/analysis-context";
import { financeAnalysisSchema } from "./schemas";
import { execute } from "./service";

export const FINANCE_ANALYSIS_ARTIFACT_TYPE="finance_analysis";

export async function generateFinanceAnalysis(userId:string) {
  const {context,contextHash}=await buildFinanceAnalysisContext(userId);
  const dataAsOf=[context.marketFacts.china.fetchedAt,context.marketFacts.us.fetchedAt].filter((value):value is string=>Boolean(value)).sort().at(-1)??new Date().toISOString();
  return execute({userId,task:"finance_analysis",title:`财富 AI 分析 · ${new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Shanghai"}).format(new Date())}`,artifactType:FINANCE_ANALYSIS_ARTIFACT_TYPE,schema:financeAnalysisSchema,context,sources:[{title:"A 股市场快照",type:"market_snapshot",dataAsOf:context.marketFacts.china.marketTime},{title:"美股市场快照",type:"market_snapshot",dataAsOf:context.marketFacts.us.marketTime},{title:"当前基金持仓事实",type:"fund_holdings",dataAsOf},{title:"基金组合真实快照",type:"fund_portfolio_snapshots",dataAsOf:context.dataFreshness.snapshotEndDate}],deduplicationKey:`finance_analysis:${contextHash}`,inputHash:contextHash,dataAsOf,validateOutput:assertFinanceAnalysisOutput});
}
