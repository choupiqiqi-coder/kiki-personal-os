import "server-only";
import type { ResearchFact,ResearchSource,StatisticMethod } from "@/lib/finance/market-research";

const EASTMONEY_LIST="https://push2.eastmoney.com/api/qt/clist/get";
const headers={"User-Agent":"Kiki-Personal-OS/1.0","Accept":"application/json"};
const timeout=7000;
type EastmoneyDiff={f3?:number|string;f6?:number|string;f12?:string;f14?:string;f124?:number|string};
export type MarketStructureResult={breadth:{advancers:number;decliners:number;unchanged:number;method:StatisticMethod}|null;limits:{up:number;down:number;method:StatisticMethod}|null;turnover:{amountCny:number;previousAmountCny:number|null;changePercent:number|null;method:StatisticMethod}|null;industries:{top:ResearchFact[];bottom:ResearchFact[];method:StatisticMethod|null};style:ResearchFact[];facts:ResearchFact[];sources:ResearchSource[];limitations:string[]};

async function getList(fs:string,pz:number,fields:string,allPages=false){const makeUrl=(pn:number)=>{const url=new URL(EASTMONEY_LIST);for(const [key,value] of Object.entries({pn:String(pn),pz:String(pz),po:"1",np:"1",fltt:"2",invt:"2",fid:"f3",fs,fields}))url.searchParams.set(key,value);return url};const fetchPage=async(pn:number)=>{const url=makeUrl(pn),response=await fetch(url,{headers,signal:AbortSignal.timeout(timeout),cache:"no-store"});if(!response.ok)throw new Error(`Eastmoney HTTP ${response.status}`);const json=await response.json() as {data?:{diff?:EastmoneyDiff[];total?:number}};if(!Array.isArray(json.data?.diff))throw new Error("Eastmoney 市场结构响应无效");return{rows:json.data.diff,total:Number(json.data.total??json.data.diff.length)}};const first=await fetchPage(1);if(!allPages)return{...first,complete:true,url:makeUrl(1).toString()};const pageCount=Math.ceil(first.total/pz),rows=[...first.rows];let successfulPages=1;for(let start=2;start<=pageCount;start+=8){const pages=await Promise.allSettled(Array.from({length:Math.min(8,pageCount-start+1)},(_,i)=>fetchPage(start+i)));for(const page of pages)if(page.status==="fulfilled"){rows.push(...page.value.rows);successfulPages++;}}return{rows,total:first.total,complete:successfulPages===pageCount,url:makeUrl(1).toString()};}
const finite=(value:unknown)=>{const n=Number(value);return Number.isFinite(n)?n:null};
const isoFromEpoch=(value:unknown)=>{const n=finite(value);return n&&n>0?new Date(n*1000).toISOString():null};

export async function collectMarketStructure():Promise<MarketStructureResult>{
  const fetchedAt=new Date().toISOString(),facts:ResearchFact[]=[],sources:ResearchSource[]=[],limitations:string[]=[];
  let breadth:MarketStructureResult["breadth"]=null,limits:MarketStructureResult["limits"]=null,turnover:MarketStructureResult["turnover"]=null;
  try{
    const result=await getList("m:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23,m:0+t:81+s:2048",100,"f3,f6,f12,f14,f124",true);
    const rows=result.rows.filter(row=>finite(row.f3)!=null),sourceTimestamp=rows.map(row=>isoFromEpoch(row.f124)).filter((x):x is string=>Boolean(x)).sort().at(-1)??null;
    const method:StatisticMethod={sampleSize:rows.length,universe:"沪深主板、科创板、创业板、北交所返回的 A 股证券",filterRule:`仅统计接口成功返回且涨跌幅为有效数值的证券；包含 ST；涨跌幅 >0/<0/=0 分别计为上涨/下跌/平盘；停牌且无有效涨跌幅者排除${result.complete?"；全分页采集完成":"；部分分页请求失败，当前为透明的有效样本统计"}`,sourceTimestamp,fetchedAt};
    const advancers=rows.filter(row=>Number(row.f3)>0).length,decliners=rows.filter(row=>Number(row.f3)<0).length,unchanged=rows.filter(row=>Number(row.f3)===0).length;
    breadth={advancers,decliners,unchanged,method};facts.push({factId:"cn-breadth",kind:"breadth",statement:`A股样本 ${rows.length} 只，上涨 ${advancers}、下跌 ${decliners}、平盘 ${unchanged}`,sourceId:"eastmoney-structure",sourceTimestamp});
    const amountCny=rows.reduce((sum,row)=>sum+(finite(row.f6)??0),0);turnover={amountCny,previousAmountCny:null,changePercent:null,method};facts.push({factId:"cn-turnover",kind:"turnover",statement:`A股样本成交额合计 ${amountCny.toFixed(0)} 元`,value:amountCny,unit:"CNY",sourceId:"eastmoney-structure",sourceTimestamp});
    const limitUp=rows.filter(row=>Number(row.f3)>=9.9).length,limitDown=rows.filter(row=>Number(row.f3)<=-9.9).length;
    limits={up:limitUp,down:limitDown,method:{...method,filterRule:"同一 A 股样本中按涨跌幅 >=9.9% / <=-9.9% 的简化固定阈值统计；不同板块涨跌停规则未穿透，因此仅作市场参考"}};
    facts.push({factId:"cn-limits",kind:"limit",statement:`固定 9.9% 阈值参考：涨停样本 ${limitUp}、跌停样本 ${limitDown}`,sourceId:"eastmoney-structure",sourceTimestamp});
    sources.push({sourceId:"eastmoney-structure",name:"东方财富市场参考行情",url:result.url,level:"market_reference",publishedAt:sourceTimestamp,fetchedAt});
  }catch(error){limitations.push(`A股市场宽度与成交额暂不可用：${message(error)}`);}
  let industries:MarketStructureResult["industries"]={top:[],bottom:[],method:null};
  try{
    const result=await getList("m:90+t:2",100,"f3,f12,f14,f124",true);const rows=result.rows.filter(row=>row.f14&&finite(row.f3)!=null);const sourceTimestamp=rows.map(row=>isoFromEpoch(row.f124)).filter((x):x is string=>Boolean(x)).sort().at(-1)??null;
    const method:StatisticMethod={sampleSize:rows.length,universe:"东方财富行业板块分类",filterRule:`保留接口返回且涨跌幅有效的行业板块，按涨跌幅降序取 Top 5、升序取 Bottom 5${result.complete?"；全分页采集完成":"；部分分页请求失败"}`,sourceTimestamp,fetchedAt};
    const map=(row:EastmoneyDiff,index:number,side:"top"|"bottom"):ResearchFact=>({factId:`cn-industry-${side}-${index+1}-${row.f12}`,kind:"industry",statement:`${row.f14} ${Number(row.f3)>0?"+":""}${Number(row.f3).toFixed(2)}%`,value:Number(row.f3),unit:"percent",sourceId:"eastmoney-industries",sourceTimestamp});
    const sorted=[...rows].sort((a,b)=>Number(b.f3)-Number(a.f3));industries={top:sorted.slice(0,5).map((r,i)=>map(r,i,"top")),bottom:sorted.slice(-5).reverse().map((r,i)=>map(r,i,"bottom")),method};facts.push(...industries.top,...industries.bottom);
    sources.push({sourceId:"eastmoney-industries",name:"东方财富行业板块参考行情",url:result.url,level:"market_reference",publishedAt:sourceTimestamp,fetchedAt});
  }catch(error){limitations.push(`行业板块排行暂不可用：${message(error)}`);}
  const style:ResearchFact[]=[];try{const url=new URL("https://push2.eastmoney.com/api/qt/stock/get");url.searchParams.set("secid","1.000852");url.searchParams.set("fields","f2,f3,f12,f14,f124");const response=await fetch(url,{headers,signal:AbortSignal.timeout(timeout),cache:"no-store"});if(!response.ok)throw new Error(`HTTP ${response.status}`);const json=await response.json() as {data?:EastmoneyDiff};const change=finite(json.data?.f3),time=isoFromEpoch(json.data?.f124);if(change==null)throw new Error("中证1000涨跌幅无效");const fact={factId:"cn-style-csi1000",kind:"style" as const,statement:`中证1000 ${change>0?"+":""}${change.toFixed(2)}%，作为小盘风格参考`,value:change,unit:"percent",sourceId:"eastmoney-style",sourceTimestamp:time};style.push(fact);facts.push(fact);sources.push({sourceId:"eastmoney-style",name:"东方财富中证1000市场参考行情",url:url.toString(),level:"market_reference",publishedAt:time,fetchedAt});}catch(error){limitations.push(`小盘风格参考暂不可用：${message(error)}`);}
  return{breadth,limits,turnover,industries,style,facts,sources,limitations};
}
function message(error:unknown){return error instanceof Error?error.message:"未知错误";}
