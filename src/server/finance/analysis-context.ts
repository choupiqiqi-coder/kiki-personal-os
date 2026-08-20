import "server-only";
import { summarizeFundHoldings } from "@/lib/finance/fund-calculations";
import { buildTrendFacts,hashFinanceAnalysisContext,type FinanceAnalysisContext,type FinanceIndexFact } from "@/lib/finance/analysis-context";
import { createDataAccess } from "@/server/data";
import { shanghaiDate } from "@/server/data/fund-trends";
import { getCachedMarketOverview,getCachedUSMarketOverview } from "@/server/market";

export async function buildFinanceAnalysisContext(userId:string) {
  const data=await createDataAccess();
  const [china,us,funds,snapshots]=await Promise.all([getCachedMarketOverview(userId),getCachedUSMarketOverview(userId),data.funds.list(userId),data.fundTrends.list(userId)]);
  const summary=summarizeFundHoldings(funds);
  const fundFacts=funds.map(fund=>({holdingId:fund.id,fundCode:fund.fund_code,fundName:fund.fund_name,fundType:fund.fund_type,tags:fund.tags,shares:numberOrNull(fund.shares),invested:Number(fund.cost_basis),latestNav:numberOrNull(fund.latest_nav),navDate:fund.nav_date,marketValue:numberOrNull(fund.market_value),profit:numberOrNull(fund.cumulative_return),profitRate:numberOrNull(fund.return_rate),isQdii:isExplicitQdii(fund.fund_type,fund.tags,fund.fund_name)}));
  const contributionFacts=fundFacts.map(fund=>({...fund,assetShare:summary.marketValue&&fund.marketValue!=null?fund.marketValue/summary.marketValue:null})).map(({holdingId,fundCode,fundName,marketValue,profit,profitRate,assetShare})=>({holdingId,fundCode,fundName,marketValue,profit,profitRate,assetShare})).sort((a,b)=>(b.profit??-Infinity)-(a.profit??-Infinity));
  const trends=buildTrendFacts(snapshots,shanghaiDate());
  const limitations:string[]=[];
  if(!china.data)limitations.push("A 股市场快照不可用，不能判断 A 股表现");
  if(!us.data)limitations.push("美股市场快照不可用，不能判断美股表现");
  if(trends.insufficientHistory)limitations.push(`组合目前只有 ${trends.snapshotDays} 天真实 Snapshot，不能判断 7 日或更长趋势，不能倒推、补点或插值`);
  for(const fund of fundFacts)if(!fund.navDate)limitations.push(`${fund.fundName} 尚无正式净值日期`);
  const qdii=fundFacts.filter(fund=>fund.isQdii&&fund.navDate);if(qdii.length)limitations.push(`QDII 使用滞后的正式净值日期：${qdii.map(f=>`${f.fundName} ${f.navDate}`).join("；")}`);
  const unknownExposure=funds.some(fund=>fund.tags.length===0&&!fund.benchmark);
  if(unknownExposure)limitations.push("部分基金缺少可靠标签或基准，不能判断行业、国家、个股权重等资产暴露");
  const context:FinanceAnalysisContext={contextVersion:"finance-analysis-v1",marketFacts:{china:{indices:mapChina(china.data?.indices??[]),marketTime:china.data?.dataTime??null,fetchedAt:china.data?.fetchedAt??null,source:china.data?.source??null},us:{indices:(us.data?.indices??[]).map(item=>({code:item.code,name:item.name,value:Number(item.value),changePercent:Number(item.changePercent),marketTime:item.tradingDate})),marketTime:us.data?.marketTime??null,fetchedAt:us.data?.fetchedAt??null,source:us.data?.source??null}},portfolioFacts:{marketValue:summary.marketValue,invested:summary.investedCost,profit:summary.holdingProfit,profitRate:summary.returnRate},fundFacts,contributionFacts,trendFacts:trends,dataFreshness:{chinaMarketTime:china.data?.dataTime??null,usMarketTime:us.data?.marketTime??null,fundNavDates:fundFacts.map(f=>({fundCode:f.fundCode,fundName:f.fundName,navDate:f.navDate,isQdii:f.isQdii})),snapshotStartDate:snapshots[0]?.snapshot_date??null,snapshotEndDate:snapshots.at(-1)?.snapshot_date??null},limitations,unknownExposure};
  return {context,contextHash:hashFinanceAnalysisContext(context)};
}
function mapChina(rows:Array<{code:string;name:string;value:number;changePercent:number;dataTime:string}>):FinanceIndexFact[]{return rows.map(item=>({code:item.code,name:item.name,value:Number(item.value),changePercent:Number(item.changePercent),marketTime:item.dataTime}));}
function numberOrNull(value:number|null){return value==null?null:Number(value);}
function isExplicitQdii(type:string|null,tags:string[],legalName:string){return Boolean(type?.toUpperCase().includes("QDII")||tags.some(tag=>tag.toUpperCase().includes("QDII"))||legalName.toUpperCase().includes("(QDII)"));}
