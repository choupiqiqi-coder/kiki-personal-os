import { createHash } from "node:crypto";

export type SourceLevel="official"|"market_reference"|"high"|"medium";
export type ResearchSource={sourceId:string;name:string;url:string|null;level:SourceLevel;publishedAt:string|null;fetchedAt:string};
export type ResearchFact={factId:string;kind:"index"|"breadth"|"turnover"|"limit"|"industry"|"style"|"macro"|"news"|"fund";statement:string;value?:number|null;unit?:string|null;sourceId:string;sourceTimestamp:string|null};
export type StatisticMethod={sampleSize:number;universe:string;filterRule:string;sourceTimestamp:string|null;fetchedAt:string};
export type MarketResearchContext={
  contextVersion:"market-research-v1"; researchDate:string;
  marketOverview:{china:ResearchFact[];us:ResearchFact[]};
  marketStructure:{breadth:{advancers:number;decliners:number;unchanged:number;method:StatisticMethod}|null;limits:{up:number;down:number;method:StatisticMethod}|null;turnover:{amountCny:number;previousAmountCny:number|null;changePercent:number|null;method:StatisticMethod}|null;industries:{top:ResearchFact[];bottom:ResearchFact[];method:StatisticMethod|null};style:ResearchFact[]};
  macroEvents:ResearchFact[];
  marketNews:Array<{factId:string;headline:string;sourceId:string;publishedAt:string|null;factualSummary:string;relatedMarkets:string[];confidence:"official"|"high"|"medium"}>;
  myFundExposure:Array<{factId:string;fundCode:string;fundName:string;relationshipStatus:"verified"|"unknown";relationship:string;navDate:string|null;sourceId:string}>;
  facts:ResearchFact[];sources:ResearchSource[];dataLimitations:string[];dataAsOf:{china:string|null;us:string|null;news:string|null;fetchedAt:string};
};

export type MarketResearchOutput={
  summary:string;coreConclusions:string[];marketPanorama:string;
  drivers:{verifiedFacts:Array<{factId:string;statement:string}>;possibleDrivers:Array<{interpretation:string;evidenceFactIds:string[];relationship:"time_aligned"|"direction_aligned"|"possible_influence";confidence:"low"|"medium"}>;unknowns:string[]};
  marketStructure:string;crossMarket:string;fundRelationship:string;
  watchNext:Array<{item:string;why:string;changesViewWhen:string;evidenceFactIds:string[]}>;
  risks:string[];dataLimitations:string[];dataAsOf:string;
};

export const marketResearchSchema:Record<string,unknown>={type:"object",additionalProperties:false,required:["summary","coreConclusions","marketPanorama","drivers","marketStructure","crossMarket","fundRelationship","watchNext","risks","dataLimitations","dataAsOf"],properties:{summary:{type:"string"},coreConclusions:{type:"array",minItems:3,maxItems:5,items:{type:"string"}},marketPanorama:{type:"string"},drivers:{type:"object",additionalProperties:false,required:["verifiedFacts","possibleDrivers","unknowns"],properties:{verifiedFacts:{type:"array",items:{type:"object",additionalProperties:false,required:["factId","statement"],properties:{factId:{type:"string"},statement:{type:"string"}}}},possibleDrivers:{type:"array",items:{type:"object",additionalProperties:false,required:["interpretation","evidenceFactIds","relationship","confidence"],properties:{interpretation:{type:"string"},evidenceFactIds:{type:"array",minItems:1,items:{type:"string"}},relationship:{type:"string",enum:["time_aligned","direction_aligned","possible_influence"]},confidence:{type:"string",enum:["low","medium"]}}}},unknowns:{type:"array",items:{type:"string"}}}},marketStructure:{type:"string"},crossMarket:{type:"string"},fundRelationship:{type:"string"},watchNext:{type:"array",minItems:3,maxItems:5,items:{type:"object",additionalProperties:false,required:["item","why","changesViewWhen","evidenceFactIds"],properties:{item:{type:"string"},why:{type:"string"},changesViewWhen:{type:"string"},evidenceFactIds:{type:"array",items:{type:"string"}}}}},risks:{type:"array",items:{type:"string"}},dataLimitations:{type:"array",items:{type:"string"}},dataAsOf:{type:"string"}}};

export function assertMarketResearchContext(context:MarketResearchContext){const sourceIds=new Set(context.sources.map(x=>x.sourceId));for(const fact of context.facts)if(!sourceIds.has(fact.sourceId))throw new Error(`Fact ${fact.factId} 引用了不存在的 Source ID: ${fact.sourceId}`);for(const item of context.marketNews)if(!sourceIds.has(item.sourceId))throw new Error(`News ${item.factId} 引用了不存在的 Source ID: ${item.sourceId}`);for(const item of context.myFundExposure)if(!sourceIds.has(item.sourceId))throw new Error(`Fund relation ${item.factId} 引用了不存在的 Source ID: ${item.sourceId}`);}

const bannedCausality=[/导致/,/引发/,/造成/,/驱动了/,/因为[^。；，]{0,80}(?:所以|因此)[^。；，]{0,30}(?:上涨|下跌)/,/市场(?:上涨|下跌)[^。；，]{0,30}(?:主要)?(?:是)?由于/,/(?:是|构成)今日行情的原因/,/市场就是因为/];
export function assertMarketResearchOutput(value:Record<string,unknown>,context?:MarketResearchContext):asserts value is MarketResearchOutput{
  for(const key of ["summary","marketPanorama","marketStructure","crossMarket","fundRelationship","dataAsOf"])if(typeof value[key]!=="string")throw new Error(`Market Research 输出缺少 ${key}`);
  for(const key of ["coreConclusions","risks","dataLimitations"])if(!Array.isArray(value[key]))throw new Error(`Market Research 输出缺少 ${key}`);
  if(!value.drivers||typeof value.drivers!=="object"||!Array.isArray(value.watchNext))throw new Error("Market Research 输出结构无效");
  const ids=new Set(context?.facts.map(f=>f.factId)??[]);const drivers=value.drivers as MarketResearchOutput["drivers"];
  if(!Array.isArray(drivers.verifiedFacts)||!Array.isArray(drivers.possibleDrivers)||!Array.isArray(drivers.unknowns))throw new Error("驱动因素结构无效");
  for(const item of drivers.verifiedFacts)if(!ids.has(item.factId))throw new Error(`AI 引用了不存在的 Fact ID: ${item.factId}`);
  for(const item of drivers.possibleDrivers){if(!item.evidenceFactIds?.length)throw new Error("可能驱动因素缺少证据 Fact ID");if(!["time_aligned","direction_aligned","possible_influence"].includes(item.relationship))throw new Error(`AI 使用了不允许的驱动关系: ${item.relationship}`);if(!["low","medium"].includes(item.confidence))throw new Error(`AI 使用了不允许的驱动置信度: ${item.confidence}`);for(const id of item.evidenceFactIds)if(!ids.has(id))throw new Error(`AI 引用了不存在的 Fact ID: ${id}`);}
  for(const item of value.watchNext as MarketResearchOutput["watchNext"])for(const id of item.evidenceFactIds??[])if(!ids.has(id))throw new Error(`观察项引用不存在的 Fact ID: ${id}`);
  const text=JSON.stringify(value);for(const pattern of bannedCausality){const match=text.match(pattern);if(match)throw new Error(`AI 使用了未经允许的确定性因果措辞：${extractSentence(text,match.index??0)}`);}
  if(context){assertMarketResearchContext(context);const allowed=new Set((JSON.stringify(context).replaceAll(",","").match(/[-+]?\d+(?:\.\d+)?%?/g)??[]).map(normalizeNumber));for(const token of text.replaceAll(",","").match(/[-+]?\d+(?:\.\d+)?%?/g)??[]){const normalized=normalizeNumber(token);if(!allowed.has(normalized)&&!/^[1-5]$/.test(normalized))throw new Error(`AI 输出包含 Context 中不存在的数字: ${token}`);}}
  const reportChars=[value.summary,...(value.coreConclusions as string[]),value.marketPanorama,value.marketStructure,value.crossMarket,value.fundRelationship,...(value.watchNext as MarketResearchOutput["watchNext"]).flatMap(x=>[x.item,x.why,x.changesViewWhen]),...(value.risks as string[]),...(value.dataLimitations as string[])].join("").length;if(reportChars<1200||reportChars>3500)throw new Error(`Market Research 报告长度 ${reportChars} 字，不符合深度报告要求`);
  if(drivers.verifiedFacts.length===0&&drivers.possibleDrivers.length===0&&!drivers.unknowns.some(x=>x.includes("当前事实不足以确认主要驱动因素")))throw new Error("证据不足时必须明确主要驱动因素未知");
}
export function hashMarketResearchContext(context:MarketResearchContext){return createHash("sha256").update(stableStringify(context)).digest("hex");}
function stableStringify(value:unknown):string{if(Array.isArray(value))return`[${value.map(stableStringify).join(",")}]`;if(value&&typeof value==="object")return`{${Object.entries(value as Record<string,unknown>).sort(([a],[b])=>a.localeCompare(b)).map(([key,item])=>`${JSON.stringify(key)}:${stableStringify(item)}`).join(",")}}`;return JSON.stringify(value);}
function normalizeNumber(value:string){const raw=value.replace(/^\+/,"").replace(/%$/,"");const number=Number(raw);return Number.isFinite(number)?String(number):raw;}
function extractSentence(text:string,index:number){const start=Math.max(0,Math.max(text.lastIndexOf("。",index),text.lastIndexOf("；",index),text.lastIndexOf('"',index))+1),nextStops=[text.indexOf("。",index),text.indexOf("；",index),text.indexOf('"',index)].filter(x=>x>=0),end=nextStops.length?Math.min(...nextStops):Math.min(text.length,index+120);return text.slice(start,Math.min(end+1,start+160));}
