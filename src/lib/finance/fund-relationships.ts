export type FundRelationshipFact = {
  fundCode:string;
  fundName:string;
  fundType:string|null;
  benchmark:string|null;
  confirmedTags:string[];
  associationStatus:"confirmed"|"unknown";
  relationshipStatus:"verified"|"partial"|"unknown";
  navDate:string|null;
  quoteSource:string|null;
  isQdii:boolean;
  limitations:string[];
};

type RelationshipInput = {
  fund_code:string;
  fund_name:string;
  fund_type:string|null;
  benchmark:string|null;
  tags:string[];
  association_status:"confirmed"|"unknown";
  nav_date:string|null;
  quote_source:string|null;
};

export function buildFundRelationshipFacts(funds:RelationshipInput[]):FundRelationshipFact[]{
  return funds.map((fund)=>{
    const benchmark=fund.benchmark?.trim()||null;
    const confirmedTags=[...new Set(fund.tags.map(tag=>tag.trim()).filter(Boolean))];
    const verifiedByBenchmark=fund.association_status==="confirmed"&&Boolean(benchmark);
    const verifiedByUserTags=confirmedTags.length>0;
    const relationshipStatus=verifiedByBenchmark||verifiedByUserTags?"verified":fund.fund_type?"partial":"unknown";
    const limitations:string[]=[];
    if(relationshipStatus==="partial")limitations.push("仅有基金类型，只能说明宽泛类别，不能确认具体指数、行业、国家或持仓权重");
    if(relationshipStatus==="unknown")limitations.push("缺少正式基准、用户确认标签和基金类型，无法可靠关联市场方向");
    if(!benchmark)limitations.push("缺少可验证的业绩基准");
    const isQdii=Boolean(fund.fund_type?.toUpperCase().includes("QDII")||confirmedTags.some(tag=>tag.toUpperCase().includes("QDII")));
    if(isQdii&&fund.nav_date)limitations.push(`QDII 使用正式 NAV 日期 ${fund.nav_date}，不能用指数当日涨跌代替基金收益`);
    return{fundCode:fund.fund_code,fundName:fund.fund_name,fundType:fund.fund_type,benchmark,confirmedTags,associationStatus:fund.association_status,relationshipStatus,navDate:fund.nav_date,quoteSource:fund.quote_source,isQdii,limitations};
  });
}

export function describeFundRelationship(fact:FundRelationshipFact){
  if(fact.relationshipStatus==="verified"){
    const evidence=[fact.benchmark?`业绩基准 ${fact.benchmark}`:null,fact.confirmedTags.length?`用户确认标签 ${fact.confirmedTags.join("、")}`:null].filter(Boolean);
    return `已验证关系：${evidence.join("；")}`;
  }
  if(fact.relationshipStatus==="partial")return `宽泛类别：${fact.fundType}；尚不能确认具体指数、行业、国家或持仓权重`;
  return "缺少正式基准、用户确认标签和基金类型，无法可靠关联市场方向";
}
