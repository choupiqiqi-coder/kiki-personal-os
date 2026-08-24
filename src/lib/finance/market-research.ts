import { createHash } from "node:crypto";

export type SourceLevel="official"|"market_reference"|"high"|"medium";
export type ResearchSource={sourceId:string;name:string;url:string|null;level:SourceLevel;publishedAt:string|null;fetchedAt:string};
export type ResearchFact={factId:string;kind:"index"|"breadth"|"turnover"|"limit"|"industry"|"style"|"macro"|"news"|"fund";statement:string;value?:number|null;unit?:string|null;sourceId:string;sourceTimestamp:string|null};
export type StatisticMethod={sampleSize:number;universe:string;filterRule:string;sourceTimestamp:string|null;fetchedAt:string};
export type MarketResearchContext={
  contextVersion:"market-research-v1";researchDate:string;
  marketOverview:{china:ResearchFact[];us:ResearchFact[]};
  marketStructure:{breadth:{advancers:number;decliners:number;unchanged:number;method:StatisticMethod}|null;limits:{up:number;down:number;method:StatisticMethod}|null;turnover:{amountCny:number;previousAmountCny:number|null;changePercent:number|null;method:StatisticMethod}|null;industries:{top:ResearchFact[];bottom:ResearchFact[];method:StatisticMethod|null};style:ResearchFact[]};
  macroEvents:ResearchFact[];
  marketNews:Array<{factId:string;headline:string;sourceId:string;publishedAt:string|null;factualSummary:string;relatedMarkets:string[];confidence:"official"|"high"|"medium"}>;
  myFundExposure:Array<{factId:string;fundCode:string;fundName:string;relationshipStatus:"verified"|"unknown";relationship:string;navDate:string|null;sourceId:string}>;
  facts:ResearchFact[];sources:ResearchSource[];dataLimitations:string[];dataAsOf:{china:string|null;us:string|null;news:string|null;fetchedAt:string};
};

type CitedNarrative={text:string;evidenceFactIds:string[];sourceIds:string[]};
type Interpretation={text:string;evidenceFactIds:string[];relationship:"time_aligned"|"direction_aligned"|"possible_influence";confidence:"low"|"medium"};
type WatchItem={item:string;whyItMatters:string;changesViewWhen:string;evidenceFactIds:string[]};

/** DeepSeek output. Trusted validation metadata is added by the server afterwards. */
export type MarketDailyBriefDraft={
  schemaVersion:"market-daily-brief-v2";
  todayInOneSentence:CitedNarrative;
  chinaMarket:CitedNarrative;
  overseasAndMacro:CitedNarrative;
  fundRelationship:CitedNarrative&{relationshipStatus:"verified"|"possible"|"unknown"};
  drivers:{verifiedFacts:Array<{factId:string;statement:string}>;possibleDrivers:Interpretation[];unknowns:string[]};
  interpretations:Interpretation[];
  watchNext:WatchItem[];
  unknowns:string[];
  dataLimitations:string[];
  dataAsOf:{chinaMarketTime:string|null;usMarketTime:string|null;newsTime:string|null};
};

export type BriefValidationStatus="valid"|"partial"|"rejected";
export type BriefValidation={status:Exclude<BriefValidationStatus,"rejected">;warnings:string[];hiddenClaims:Array<{section:string;reason:string}>};
export type MarketDailyBrief=MarketDailyBriefDraft&{validation:BriefValidation};
export type MarketResearchOutput=MarketDailyBrief;

const citedNarrativeSchema={type:"object",additionalProperties:false,required:["text","evidenceFactIds","sourceIds"],properties:{text:{type:"string"},evidenceFactIds:{type:"array",items:{type:"string"}},sourceIds:{type:"array",items:{type:"string"}}}};
const interpretationSchema={type:"object",additionalProperties:false,required:["text","evidenceFactIds","relationship","confidence"],properties:{text:{type:"string"},evidenceFactIds:{type:"array",items:{type:"string"}},relationship:{type:"string",enum:["time_aligned","direction_aligned","possible_influence"]},confidence:{type:"string",enum:["low","medium"]}}};
export const marketDailyBriefSchema:Record<string,unknown>={type:"object",additionalProperties:false,required:["schemaVersion","todayInOneSentence","chinaMarket","overseasAndMacro","fundRelationship","drivers","interpretations","watchNext","unknowns","dataLimitations","dataAsOf"],properties:{
  schemaVersion:{type:"string",const:"market-daily-brief-v2"},todayInOneSentence:citedNarrativeSchema,chinaMarket:citedNarrativeSchema,overseasAndMacro:citedNarrativeSchema,
  fundRelationship:{...citedNarrativeSchema,properties:{...(citedNarrativeSchema.properties as Record<string,unknown>),relationshipStatus:{type:"string",enum:["verified","possible","unknown"]}},required:["text","evidenceFactIds","sourceIds","relationshipStatus"]},
  drivers:{type:"object",additionalProperties:false,required:["verifiedFacts","possibleDrivers","unknowns"],properties:{verifiedFacts:{type:"array",items:{type:"object",additionalProperties:false,required:["factId","statement"],properties:{factId:{type:"string"},statement:{type:"string"}}}},possibleDrivers:{type:"array",items:interpretationSchema},unknowns:{type:"array",items:{type:"string"}}}},
  interpretations:{type:"array",items:interpretationSchema},watchNext:{type:"array",minItems:3,maxItems:5,items:{type:"object",additionalProperties:false,required:["item","whyItMatters","changesViewWhen","evidenceFactIds"],properties:{item:{type:"string"},whyItMatters:{type:"string"},changesViewWhen:{type:"string"},evidenceFactIds:{type:"array",items:{type:"string"}}}}},unknowns:{type:"array",items:{type:"string"}},dataLimitations:{type:"array",items:{type:"string"}},dataAsOf:{type:"object",additionalProperties:false,required:["chinaMarketTime","usMarketTime","newsTime"],properties:{chinaMarketTime:{type:["string","null"]},usMarketTime:{type:["string","null"]},newsTime:{type:["string","null"]}}}
}};
export const marketResearchSchema=marketDailyBriefSchema;

export class MarketDailyBriefRejectedError extends Error{readonly status="rejected" as const;}

export function assertMarketResearchContext(context:MarketResearchContext){const sourceIds=new Set(context.sources.map(x=>x.sourceId));for(const fact of context.facts)if(!sourceIds.has(fact.sourceId))throw new Error(`Fact ${fact.factId} 引用了不存在的 Source ID: ${fact.sourceId}`);for(const item of context.marketNews)if(!sourceIds.has(item.sourceId))throw new Error(`News ${item.factId} 引用了不存在的 Source ID: ${item.sourceId}`);for(const item of context.myFundExposure)if(!sourceIds.has(item.sourceId))throw new Error(`Fund relation ${item.factId} 引用了不存在的 Source ID: ${item.sourceId}`);}

export function validateMarketDailyBrief(value:Record<string,unknown>,context:MarketResearchContext):MarketDailyBrief{
  assertDraftShape(value);assertMarketResearchContext(context);
  const draft=structuredClone(value) as MarketDailyBriefDraft;
  const factIds=new Set(context.facts.map(f=>f.factId)),sourceIds=new Set(context.sources.map(s=>s.sourceId));
  const warnings:string[]=[],hiddenClaims:Array<{section:string;reason:string}>=[];
  const assertIds=(facts:string[],sources:string[]=[])=>{for(const id of facts)if(!factIds.has(id))reject(`AI 引用了不存在的 Fact ID: ${id}`);for(const id of sources)if(!sourceIds.has(id))reject(`AI 引用了不存在的 Source ID: ${id}`);};
  for(const section of [draft.todayInOneSentence,draft.chinaMarket,draft.overseasAndMacro,draft.fundRelationship])assertIds(section.evidenceFactIds,section.sourceIds);
  for(const fact of draft.drivers.verifiedFacts){const canonical=context.facts.find(item=>item.factId===fact.factId);if(!canonical)reject(`AI 引用了不存在的 Fact ID: ${fact.factId}`);if(normalizeText(fact.statement)!==normalizeText(canonical.statement))reject(`AI 修改了已验证事实 ${fact.factId} 的内容`);}
  if(draft.fundRelationship.relationshipStatus!=="unknown"&&!context.myFundExposure.some(item=>item.relationshipStatus==="verified"))reject("AI 在缺少可靠基金暴露时创建了基金关系");
  for(const item of draft.drivers.possibleDrivers){if(!item.evidenceFactIds.length)reject("可能驱动因素缺少证据 Fact ID");assertIds(item.evidenceFactIds);assertRelationship(item);}
  for(const [name,section] of [["todayInOneSentence",draft.todayInOneSentence],["chinaMarket",draft.chinaMarket],["overseasAndMacro",draft.overseasAndMacro],["fundRelationship",draft.fundRelationship]] as const)section.text=sanitizeNarrative(name,section.text,context,warnings,hiddenClaims);
  draft.interpretations=filterClaims("interpretations",draft.interpretations,item=>item.text,item=>{assertRelationship(item);if(!item.evidenceFactIds.length)return"一般解释缺少证据 Fact ID";assertIds(item.evidenceFactIds);return findNonCoreUngroundedNumber(item.text,context);},warnings,hiddenClaims);
  draft.watchNext=filterClaims("watchNext",draft.watchNext,item=>item.item,item=>{if(!item.evidenceFactIds.length)return"观察项缺少证据 Fact ID";assertIds(item.evidenceFactIds);return findNonCoreUngroundedNumber(`${item.item} ${item.whyItMatters} ${item.changesViewWhen}`,context);},warnings,hiddenClaims);
  for(const text of collectNarratives(draft))assertCoreFactNumbers(text,context);
  const length=reportLength(draft);if(length<900||length>4000)warnings.push(`简报正文长度 ${length} 字，偏离建议范围`);
  if(context.marketNews.length===0)warnings.push("当日可信新闻不足，驱动因素仅能保守解释");
  if(context.dataLimitations.length)warnings.push(...context.dataLimitations.map(item=>`数据限制：${item}`));
  return{...draft,validation:{status:warnings.length||hiddenClaims.length?"partial":"valid",warnings:[...new Set(warnings)],hiddenClaims}};
}

export function assertMarketResearchOutput(value:Record<string,unknown>,context?:MarketResearchContext):asserts value is MarketDailyBrief{
  assertArtifactShape(value);if(context)validateMarketDailyBrief(stripValidation(value),context);
}

export function hashMarketResearchContext(context:MarketResearchContext){return createHash("sha256").update(stableStringify(context)).digest("hex");}
function stableStringify(value:unknown):string{if(Array.isArray(value))return`[${value.map(stableStringify).join(",")}]`;if(value&&typeof value==="object")return`{${Object.entries(value as Record<string,unknown>).sort(([a],[b])=>a.localeCompare(b)).map(([key,item])=>`${JSON.stringify(key)}:${stableStringify(item)}`).join(",")}}`;return JSON.stringify(value);}
function reject(message:string):never{throw new MarketDailyBriefRejectedError(message);}
function normalizeText(value:string){return value.replace(/\s+/g,"").replace(/[，。；：]/g,"");}
function assertRelationship(item:Interpretation){if(!["time_aligned","direction_aligned","possible_influence"].includes(item.relationship))reject(`AI 使用了不允许的驱动关系: ${item.relationship}`);if(!["low","medium"].includes(item.confidence))reject(`AI 使用了不允许的驱动置信度: ${item.confidence}`);}
function filterClaims<T>(section:string,items:T[],label:(item:T)=>string,problem:(item:T)=>string|null,warnings:string[],hidden:Array<{section:string;reason:string}>){return items.filter(item=>{const reason=problem(item);if(!reason)return true;warnings.push(`${section} 中有一条非核心 Claim 已隐藏：${reason}`);hidden.push({section,reason:`${label(item).slice(0,80)}：${reason}`});return false;});}
function sanitizeNarrative(section:string,text:string,context:MarketResearchContext,warnings:string[],hidden:Array<{section:string;reason:string}>){return sentences(text).filter(sentence=>{const reason=findNonCoreUngroundedNumber(sentence,context);if(!reason)return true;warnings.push(`${section} 中有一条非核心 Claim 已隐藏：${reason}`);hidden.push({section,reason:`${sentence.slice(0,80)}：${reason}`});return false;}).join("");}
function stripValidation(value:Record<string,unknown>){const draft={...value};delete draft.validation;return draft;}

function assertDraftShape(value:Record<string,unknown>){
  if(value.schemaVersion!=="market-daily-brief-v2")reject("Market Daily Brief v2 Schema 无效");
  for(const key of ["todayInOneSentence","chinaMarket","overseasAndMacro","fundRelationship","drivers","dataAsOf"])if(!value[key]||typeof value[key]!=="object")reject(`Market Daily Brief 输出缺少 ${key}`);
  for(const key of ["interpretations","watchNext","unknowns","dataLimitations"])if(!Array.isArray(value[key]))reject(`Market Daily Brief 输出缺少 ${key}`);
  const sections=[value.todayInOneSentence,value.chinaMarket,value.overseasAndMacro,value.fundRelationship] as Array<Record<string,unknown>>;
  for(const section of sections)if(typeof section.text!=="string"||!Array.isArray(section.evidenceFactIds)||!Array.isArray(section.sourceIds))reject("Market Daily Brief 引用结构无效");
  const drivers=value.drivers as Record<string,unknown>;if(!Array.isArray(drivers.verifiedFacts)||!Array.isArray(drivers.possibleDrivers)||!Array.isArray(drivers.unknowns))reject("驱动因素结构无效");
}
function assertArtifactShape(value:Record<string,unknown>){assertDraftShape(value);const validation=value.validation as Record<string,unknown>|undefined;if(!validation||!["valid","partial"].includes(String(validation.status))||!Array.isArray(validation.warnings)||!Array.isArray(validation.hiddenClaims))reject("Artifact 缺少可信校验状态");}

function collectNarratives(value:MarketDailyBriefDraft){return[value.todayInOneSentence.text,value.chinaMarket.text,value.overseasAndMacro.text,value.fundRelationship.text,...value.drivers.verifiedFacts.map(x=>x.statement),...value.drivers.possibleDrivers.map(x=>x.text),...value.interpretations.map(x=>x.text),...value.watchNext.flatMap(x=>[x.item,x.whyItMatters,x.changesViewWhen]),...value.unknowns,...value.dataLimitations];}
function reportLength(value:MarketDailyBriefDraft){return collectNarratives(value).join("").length;}

type NumericDimension="scalar"|"currency"|"percent";
type NumericMention={raw:string;value:number;baseValue:number;decimals:number;dimension:NumericDimension;factor:number;start:number;end:number};
const numericPattern=/[-+]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?\s*(?:万亿元|亿元|万元|个百分点|百分点|元|%|％)?/g;
const coreFactLanguage=/(?:上证指数|沪深300|中证A500|NASDAQ|S&P|Dow Jones|道琼斯|指数(?:点位|涨跌幅)|成交额|上涨家数|下跌家数|平盘家数|涨停|跌停|CPI|PPI|GDP|失业率|就业率|利率|基点|NAV|净值|基金(?:收益|金额|市值|份额|投入|本金)|正式统计|新闻称|公告称|政策(?:为|称)|日期|时间|截至|\d{4}年|\d{1,2}月|\d{1,2}日)/i;
function parseNumericMentions(text:string):NumericMention[]{return[...text.matchAll(numericPattern)].flatMap(match=>{const raw=match[0].trim(),numberText=raw.match(/[-+]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?/)?.[0];if(!numberText)return[];const value=Number(numberText.replaceAll(",",""));if(!Number.isFinite(value))return[];const unit=raw.slice(numberText.length).trim(),decimals=numberText.includes(".")?numberText.split(".")[1].length:0,factor=unit==="万亿元"?1e12:unit==="亿元"?1e8:unit==="万元"?1e4:1,dimension:NumericDimension=unit==="%"||unit==="％"||unit==="百分点"||unit==="个百分点"?"percent":unit.endsWith("元")?"currency":"scalar",start=match.index??0;return[{raw,value,baseValue:value*factor,decimals,dimension,factor,start,end:start+match[0].length}];});}
function collectContextNumbers(context:MarketResearchContext){const mentions:NumericMention[]=[];const visit=(value:unknown,key="")=>{if(typeof value==="string"){mentions.push(...parseNumericMentions(value));return;}if(typeof value==="number"&&Number.isFinite(value)){const dimension:NumericDimension=/amountCny|previousAmountCny/i.test(key)?"currency":/changePercent/i.test(key)?"percent":"scalar";mentions.push({raw:String(value),value,baseValue:value,decimals:decimalPlaces(value),dimension,factor:1,start:0,end:String(value).length});return;}if(Array.isArray(value)){for(const item of value)visit(item);return;}if(value&&typeof value==="object")for(const[childKey,item]of Object.entries(value as Record<string,unknown>))visit(item,childKey);};visit(context);for(const fact of context.facts){if(typeof fact.value!=="number"||!Number.isFinite(fact.value))continue;const unit=(fact.unit??"").toLowerCase(),dimension:NumericDimension=unit==="cny"||unit.endsWith("元")?"currency":unit==="percent"||unit==="%"?"percent":"scalar";mentions.push({raw:String(fact.value),value:fact.value,baseValue:fact.value,decimals:decimalPlaces(fact.value),dimension,factor:1,start:0,end:String(fact.value).length});}return mentions;}
function decimalPlaces(value:number){const text=String(value);return text.includes(".")?text.split(".")[1].length:0;}
function isDeterministicEquivalent(output:NumericMention,source:NumericMention){if(output.dimension!==source.dimension)return false;const normalized=source.baseValue/output.factor;if(output.decimals===0)return Number.isInteger(normalized)&&normalized===output.value;return Number(normalized.toFixed(output.decimals))===output.value;}
function sentences(text:string){return text.split(/(?<=[。！？；\n])/).filter(Boolean);}
function assertCoreFactNumbers(text:string,context:MarketResearchContext){const sources=collectContextNumbers(context);for(const sentence of sentences(text)){if(!coreFactLanguage.test(sentence))continue;for(const output of parseNumericMentions(sentence))if(!sources.some(source=>isDeterministicEquivalent(output,source)))reject(`AI 输出包含无法追溯的核心事实数字: ${output.raw}`);}}
function findNonCoreUngroundedNumber(text:string,context:MarketResearchContext){const sources=collectContextNumbers(context);for(const sentence of sentences(text)){if(coreFactLanguage.test(sentence))continue;for(const output of parseNumericMentions(sentence))if(!sources.some(source=>isDeterministicEquivalent(output,source)))return`包含未登记的非核心派生数字 ${output.raw}`;}return null;}
