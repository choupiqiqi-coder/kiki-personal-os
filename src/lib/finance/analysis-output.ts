export type FinanceAnalysisOutput = { summary:string; marketReview:string; portfolioReview:string; watchNext:string[]; risks:string[]; dataLimitations:string[]; dataAsOf:string };
const keys=["summary","marketReview","portfolioReview","watchNext","risks","dataLimitations","dataAsOf"] as const;
export function assertFinanceAnalysisOutput(value:Record<string,unknown>):asserts value is FinanceAnalysisOutput {
  const actual=Object.keys(value);
  if(actual.some(key=>!keys.includes(key as typeof keys[number]))||keys.some(key=>!(key in value)))throw new Error("AI 分析结构包含缺失或未知字段");
  for(const key of ["summary","marketReview","portfolioReview","dataAsOf"] as const)if(typeof value[key]!=="string"||!value[key])throw new Error(`AI 分析字段 ${key} 无效`);
  for(const key of ["watchNext","risks","dataLimitations"] as const)if(!Array.isArray(value[key])||!value[key].every(item=>typeof item==="string"&&item.length>0))throw new Error(`AI 分析字段 ${key} 无效`);
  const watchNext=value.watchNext as string[];
  if(watchNext.length<3||watchNext.length>5)throw new Error("AI 关注项必须为 3 至 5 条");
}
