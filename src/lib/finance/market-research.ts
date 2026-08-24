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

export function assertMarketResearchOutput(value:Record<string,unknown>,context?:MarketResearchContext):asserts value is MarketResearchOutput{
  for(const key of ["summary","marketPanorama","marketStructure","crossMarket","fundRelationship","dataAsOf"])if(typeof value[key]!=="string")throw new Error(`Market Research 输出缺少 ${key}`);
  for(const key of ["coreConclusions","risks","dataLimitations"])if(!Array.isArray(value[key]))throw new Error(`Market Research 输出缺少 ${key}`);
  if(!value.drivers||typeof value.drivers!=="object"||!Array.isArray(value.watchNext))throw new Error("Market Research 输出结构无效");
  const ids=new Set(context?.facts.map(f=>f.factId)??[]);const drivers=value.drivers as MarketResearchOutput["drivers"];
  if(!Array.isArray(drivers.verifiedFacts)||!Array.isArray(drivers.possibleDrivers)||!Array.isArray(drivers.unknowns))throw new Error("驱动因素结构无效");
  for(const item of drivers.verifiedFacts)if(!ids.has(item.factId))throw new Error(`AI 引用了不存在的 Fact ID: ${item.factId}`);
  for(const item of drivers.possibleDrivers){if(!item.evidenceFactIds?.length)throw new Error("可能驱动因素缺少证据 Fact ID");if(!["time_aligned","direction_aligned","possible_influence"].includes(item.relationship))throw new Error(`AI 使用了不允许的驱动关系: ${item.relationship}`);if(!["low","medium"].includes(item.confidence))throw new Error(`AI 使用了不允许的驱动置信度: ${item.confidence}`);for(const id of item.evidenceFactIds)if(!ids.has(id))throw new Error(`AI 引用了不存在的 Fact ID: ${id}`);}
  for(const item of value.watchNext as MarketResearchOutput["watchNext"])for(const id of item.evidenceFactIds??[])if(!ids.has(id))throw new Error(`观察项引用不存在的 Fact ID: ${id}`);
  const prose=collectOutputProse(value as MarketResearchOutput);
  if(context){assertMarketResearchContext(context);assertNumbersAreGrounded(prose,context);}
  const reportChars=[value.summary,...(value.coreConclusions as string[]),value.marketPanorama,value.marketStructure,value.crossMarket,value.fundRelationship,...(value.watchNext as MarketResearchOutput["watchNext"]).flatMap(x=>[x.item,x.why,x.changesViewWhen]),...(value.risks as string[]),...(value.dataLimitations as string[])].join("").length;if(reportChars<1200||reportChars>3500)throw new Error(`Market Research 报告长度 ${reportChars} 字，不符合深度报告要求`);
  if(drivers.verifiedFacts.length===0&&drivers.possibleDrivers.length===0&&!drivers.unknowns.some(x=>x.includes("当前事实不足以确认主要驱动因素")))throw new Error("证据不足时必须明确主要驱动因素未知");
}
export function hashMarketResearchContext(context:MarketResearchContext){return createHash("sha256").update(stableStringify(context)).digest("hex");}
function stableStringify(value:unknown):string{if(Array.isArray(value))return`[${value.map(stableStringify).join(",")}]`;if(value&&typeof value==="object")return`{${Object.entries(value as Record<string,unknown>).sort(([a],[b])=>a.localeCompare(b)).map(([key,item])=>`${JSON.stringify(key)}:${stableStringify(item)}`).join(",")}}`;return JSON.stringify(value);}

function collectOutputProse(value:MarketResearchOutput){
  return [
    value.summary,...value.coreConclusions,value.marketPanorama,
    ...value.drivers.verifiedFacts.map(item=>item.statement),
    ...value.drivers.possibleDrivers.map(item=>item.interpretation),
    ...value.drivers.unknowns,value.marketStructure,value.crossMarket,value.fundRelationship,
    ...value.watchNext.flatMap(item=>[item.item,item.why,item.changesViewWhen]),
    ...value.risks,...value.dataLimitations,
  ];
}

type NumericDimension="scalar"|"currency"|"percent";
type NumericMention={raw:string;value:number;baseValue:number;decimals:number;dimension:NumericDimension;factor:number;start:number;end:number};
const numericPattern=/[-+]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?\s*(?:万亿元|亿元|万元|个百分点|百分点|元|%|％)?/g;

function parseNumericMentions(text:string):NumericMention[]{
  return [...text.matchAll(numericPattern)].flatMap(match=>{
    const raw=match[0].trim();
    const numberText=raw.match(/[-+]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?/)?.[0];
    if(!numberText)return[];
    const value=Number(numberText.replaceAll(",",""));
    if(!Number.isFinite(value))return[];
    const unit=raw.slice(numberText.length).trim();
    const decimals=numberText.includes(".")?numberText.split(".")[1].length:0;
    const factor=unit==="万亿元"?1e12:unit==="亿元"?1e8:unit==="万元"?1e4:1;
    const dimension:NumericDimension=unit==="%"||unit==="％"||unit==="百分点"||unit==="个百分点"?"percent":unit.endsWith("元")?"currency":"scalar";
    const start=match.index??0;
    return[{raw,value,baseValue:value*factor,decimals,dimension,factor,start,end:start+match[0].length}];
  });
}

function collectContextNumbers(context:MarketResearchContext){
  const mentions:NumericMention[]=[];
  const visit=(value:unknown,key="")=>{
    if(typeof value==="string"){mentions.push(...parseNumericMentions(value));return;}
    if(typeof value==="number"&&Number.isFinite(value)){
      const dimension:NumericDimension=/amountCny|previousAmountCny/i.test(key)?"currency":/changePercent/i.test(key)?"percent":"scalar";
      mentions.push({raw:String(value),value,baseValue:value,decimals:decimalPlaces(value),dimension,factor:1,start:0,end:String(value).length});return;
    }
    if(Array.isArray(value)){for(const item of value)visit(item);return;}
    if(value&&typeof value==="object")for(const [childKey,item] of Object.entries(value as Record<string,unknown>))visit(item,childKey);
  };
  visit(context);
  for(const fact of context.facts){
    if(typeof fact.value!=="number"||!Number.isFinite(fact.value))continue;
    const unit=(fact.unit??"").toLowerCase();
    const dimension:NumericDimension=unit==="cny"||unit.endsWith("元")?"currency":unit==="percent"||unit==="%"?"percent":"scalar";
    mentions.push({raw:String(fact.value),value:fact.value,baseValue:fact.value,decimals:decimalPlaces(fact.value),dimension,factor:1,start:0,end:String(fact.value).length});
  }
  return mentions;
}

function decimalPlaces(value:number){const text=String(value);if(!text.includes("."))return 0;return text.split(".")[1].length;}

function isDeterministicEquivalent(output:NumericMention,source:NumericMention){
  if(output.dimension!==source.dimension)return false;
  const sourceInOutputUnit=source.baseValue/output.factor;
  if(output.decimals===0)return Number.isInteger(sourceInOutputUnit)&&sourceInOutputUnit===output.value;
  return Number(sourceInOutputUnit.toFixed(output.decimals))===output.value;
}

const derivedDifferenceMarker=/(?:差值|相差|差距|之差|高出|低于|领先|落后|超出|多于|少于|百分点|相比[^。！？；\n]{0,24}(?:高|低|多|少|强|弱)|相对[^。！？；\n]{0,24}(?:高|低|多|少|强|弱))/;
const derivedRatioMarker=/(?:倍数|倍|占比|约占)/;
const alwaysStrictNumberContext=/(?:基金|NAV|净值|收益率|持仓|仓位|投入|本金|金额|市值|份额|CPI|PPI|GDP|失业率|就业率|利率|基点|新闻|公告|政策|日期|时间|截至|年|月|日)/i;

function sentenceAround(text:string,mention:NumericMention){
  const start=Math.max(text.lastIndexOf("。",mention.start),text.lastIndexOf("！",mention.start),text.lastIndexOf("？",mention.start),text.lastIndexOf("；",mention.start),text.lastIndexOf("\n",mention.start))+1;
  const candidates=["。","！","？","；","\n"].map(mark=>text.indexOf(mark,mention.end)).filter(index=>index>=0);
  const end=candidates.length?Math.min(...candidates):text.length;
  return text.slice(start,end);
}

function analyticalDerivedKind(text:string,mention:NumericMention){
  const sentence=sentenceAround(text,mention);
  if(alwaysStrictNumberContext.test(sentence))return null;
  if(derivedDifferenceMarker.test(sentence))return "difference" as const;
  if(derivedRatioMarker.test(sentence))return "ratio" as const;
  return null;
}

function isDerivedEquivalent(output:NumericMention,sources:NumericMention[],kind:"difference"|"ratio"){
  for(let left=0;left<sources.length;left++)for(let right=0;right<sources.length;right++){
    if(left===right)continue;
    const a=sources[left],b=sources[right];
    if(kind==="difference"){
      if(a.dimension!==b.dimension||a.dimension!==output.dimension)continue;
      const difference=Math.abs(a.baseValue-b.baseValue)/output.factor;
      if(output.decimals>0&&Number(difference.toFixed(output.decimals))===output.value)return true;
      if(output.decimals===0&&Number.isInteger(difference)&&difference===output.value)return true;
    }else{
      if(b.baseValue===0)continue;
      const ratio=output.dimension==="percent"?(a.baseValue/b.baseValue)*100:a.baseValue/b.baseValue;
      if(output.decimals>0&&Number(ratio.toFixed(output.decimals))===output.value)return true;
      if(output.decimals===0&&Number.isInteger(ratio)&&ratio===output.value)return true;
    }
  }
  return false;
}

function assertNumbersAreGrounded(parts:string[],context:MarketResearchContext){
  const sources=collectContextNumbers(context);
  for(const part of parts){
    for(const output of parseNumericMentions(part)){
      const derivedKind=analyticalDerivedKind(part,output);
      if(derivedKind&&isDerivedEquivalent(output,sources,derivedKind))continue;
      if(!sources.some(source=>isDeterministicEquivalent(output,source))){
        throw new Error(`AI 输出包含无法追溯的核心事实数字: ${output.raw}`);
      }
    }
  }
}
