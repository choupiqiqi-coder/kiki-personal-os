import "server-only";
import { assertMarketResearchContext,hashMarketResearchContext,type MarketResearchContext,type ResearchFact,type ResearchSource } from "@/lib/finance/market-research";
import { createClient } from "@/lib/supabase/server";
import { createDataAccess } from "@/server/data";
import { getCachedMarketOverview,getCachedUSMarketOverview } from "@/server/market";
import { collectOfficialEvents } from "./events";
import { collectMarketStructure } from "./market-structure";
import { collectMarketNews } from "./news";

export const MARKET_RESEARCH_SNAPSHOT_TYPE="market_research_context_v1";
const TTL_MS=30*60*1000;
type SnapshotRow={payload:MarketResearchContext;fetched_at:string;data_time:string};

export async function buildMarketResearchContext(userId:string,{forceRefresh=false}:{forceRefresh?:boolean}={}){
  const client=await createClient();
  const {data:cachedRows,error}=await client.from("finance_market_snapshots").select("payload,fetched_at,data_time").eq("user_id",userId).eq("snapshot_type",MARKET_RESEARCH_SNAPSHOT_TYPE).order("fetched_at",{ascending:false}).limit(20).returns<SnapshotRow[]>();
  if(error)throw new Error(error.message);
  const cached=cachedRows?.[0]??null,previousValid=cachedRows?.find(row=>row.payload?.marketStructure?.breadth&&row.payload?.marketStructure?.industries?.top?.length)??cached;
  if(cached&&!forceRefresh&&Date.now()-new Date(cached.fetched_at).getTime()<TTL_MS)return{context:cached.payload,contextHash:hashMarketResearchContext(cached.payload),source:"cache" as const};
  try{
    const context=await collectContext(userId,previousValid?.payload??null);assertMarketResearchContext(context);
    const {error:saveError}=await client.from("finance_market_snapshots").insert({user_id:userId,provider:"composite_market_research_v1",snapshot_type:MARKET_RESEARCH_SNAPSHOT_TYPE,data_time:context.dataAsOf.china??context.dataAsOf.us??context.dataAsOf.fetchedAt,fetched_at:context.dataAsOf.fetchedAt,payload:context});
    if(saveError)throw new Error(saveError.message);
    return{context,contextHash:hashMarketResearchContext(context),source:"collector" as const};
  }catch(error){if(cached)return{context:cached.payload,contextHash:hashMarketResearchContext(cached.payload),source:"cache_stale" as const,error:error instanceof Error?error.message:"采集失败"};throw error;}
}

async function collectContext(userId:string,previous:MarketResearchContext|null):Promise<MarketResearchContext>{
  const data=await createDataAccess();
  const [china,us,structure,events,news,funds]=await Promise.all([getCachedMarketOverview(userId),getCachedUSMarketOverview(userId),collectMarketStructure(),collectOfficialEvents(),collectMarketNews(),data.funds.list(userId)]);
  const fetchedAt=new Date().toISOString(),sources:ResearchSource[]=[...structure.sources,...events.sources,...news.sources],facts:ResearchFact[]=[...structure.facts,...events.facts,...news.facts];
  if(!structure.breadth&&previous?.marketStructure.breadth)structure.breadth=previous.marketStructure.breadth;
  if(!structure.limits&&previous?.marketStructure.limits)structure.limits=previous.marketStructure.limits;
  if(!structure.turnover&&previous?.marketStructure.turnover)structure.turnover={...previous.marketStructure.turnover,previousAmountCny:null,changePercent:null};
  if(structure.industries.top.length===0&&previous?.marketStructure.industries)structure.industries=previous.marketStructure.industries;
  if(structure.style.length===0&&previous?.marketStructure.style)structure.style=previous.marketStructure.style;
  if(previous)sources.push(...previous.sources);
  const chinaFacts=(china.data?.indices??[]).map(item=>({factId:`cn-index-${item.code}`,kind:"index" as const,statement:`${item.name} ${item.value.toFixed(3)}，涨跌幅 ${signed(item.changePercent)}%`,value:item.changePercent,unit:"percent",sourceId:"china-index-snapshot",sourceTimestamp:item.dataTime}));
  const usFacts=(us.data?.indices??[]).map(item=>({factId:`us-index-${item.code}`,kind:"index" as const,statement:`${item.name} ${item.value.toFixed(3)}，涨跌幅 ${signed(item.changePercent)}%`,value:item.changePercent,unit:"percent",sourceId:"us-index-snapshot",sourceTimestamp:item.tradingDate}));
  facts.push(...chinaFacts,...usFacts);
  if(china.data)sources.push({sourceId:"china-index-snapshot",name:china.data.source,url:null,level:"market_reference",publishedAt:china.data.dataTime,fetchedAt:china.data.fetchedAt});
  if(us.data)sources.push({sourceId:"us-index-snapshot",name:us.data.source,url:null,level:"market_reference",publishedAt:us.data.marketTime,fetchedAt:us.data.fetchedAt});
  const exposure=funds.map((fund,index)=>{const verified=Boolean(fund.association_status==="confirmed"&&(fund.benchmark||fund.tags.length));const relationship=verified?`已验证资料：基金类型 ${fund.fund_type??"未知"}${fund.benchmark?`；业绩基准 ${fund.benchmark}`:""}${fund.tags.length?`；用户标签 ${fund.tags.join("、")}`:""}`:"缺少明确基准或用户确认标签，无法可靠关联市场方向";const factId=`fund-relation-${index+1}-${fund.fund_code}`;facts.push({factId,kind:"fund",statement:`${fund.fund_name}：${relationship}；正式 NAV 日期 ${fund.nav_date??"未知"}`,sourceId:"fund-holdings",sourceTimestamp:fund.nav_date});return{factId,fundCode:fund.fund_code,fundName:fund.fund_name,relationshipStatus:verified?"verified" as const:"unknown" as const,relationship,navDate:fund.nav_date,sourceId:"fund-holdings"};});
  sources.push({sourceId:"fund-holdings",name:"Kiki Personal OS 当前基金持仓事实",url:null,level:"official",publishedAt:null,fetchedAt});
  if(structure.turnover&&previous?.marketStructure.turnover){const oldPoint=previous.marketStructure.turnover,method=structure.turnover.method,oldMethod=oldPoint.method;const compatible=method.sampleSize===oldMethod.sampleSize&&method.universe===oldMethod.universe&&method.filterRule===oldMethod.filterRule;if(compatible&&oldPoint.amountCny>0&&oldMethod.sourceTimestamp!==method.sourceTimestamp){structure.turnover.previousAmountCny=oldPoint.amountCny;structure.turnover.changePercent=(structure.turnover.amountCny-oldPoint.amountCny)/oldPoint.amountCny*100;}}
  const limitations=[...structure.limitations,...events.limitations,...news.limitations];if(!china.data)limitations.push("A 股核心指数快照不可用");if(!us.data)limitations.push("美股核心指数快照不可用");if(structure.style.length===0)limitations.push("V1 暂无独立小盘指数样本，市场风格只能结合核心指数与行业结构谨慎解释");if(exposure.some(x=>x.relationshipStatus==="unknown"))limitations.push("部分基金缺少可靠基准或用户确认标签，关系状态为 unknown，禁止根据名称猜测暴露");
  for(const fact of [...structure.industries.top,...structure.industries.bottom,...structure.style])if(!facts.some(x=>x.factId===fact.factId))facts.push(fact);
  return{contextVersion:"market-research-v1",researchDate:shanghaiDate(),marketOverview:{china:chinaFacts,us:usFacts},marketStructure:{breadth:structure.breadth,limits:structure.limits,turnover:structure.turnover,industries:structure.industries,style:structure.style},macroEvents:events.facts,marketNews:news.news,myFundExposure:exposure,facts,sources:uniqueSources(sources),dataLimitations:limitations,dataAsOf:{china:china.data?.dataTime??null,us:us.data?.marketTime??null,news:news.news.map(x=>x.publishedAt).filter((x):x is string=>Boolean(x)).sort().at(-1)??null,fetchedAt}};
}
function signed(value:number){return `${value>0?"+":""}${value.toFixed(2)}`;}function shanghaiDate(){return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Shanghai"}).format(new Date());}function uniqueSources(rows:ResearchSource[]){return[...new Map(rows.map(row=>[row.sourceId,row])).values()];}
