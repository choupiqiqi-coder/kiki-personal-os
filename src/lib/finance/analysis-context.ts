import { createHash } from "node:crypto";
import type { FundRelationshipFact } from "./fund-relationships";

export type FinanceIndexFact = { code:string; name:string; value:number; changePercent:number; marketTime:string };
export type FinanceFundFact = {
  holdingId:string; fundCode:string; fundName:string; fundType:string|null; tags:string[];
  shares:number|null; invested:number; latestNav:number|null; navDate:string|null;
  marketValue:number|null; profit:number|null; profitRate:number|null; isQdii:boolean;
};
export type FinanceContributionFact = { holdingId:string; fundCode:string; fundName:string; marketValue:number|null; profit:number|null; profitRate:number|null; assetShare:number|null };
export type FinanceTrendFact = { range:"7d"|"30d"|"90d"|"365d"|"all"; snapshotDays:number; insufficientHistory:boolean; startDate:string|null; endDate:string|null; marketValueChange:number|null; profitChange:number|null };
export type FinanceAnalysisContext = {
  contextVersion:"finance-analysis-v1";
  marketFacts:{
    china:{indices:FinanceIndexFact[]; marketTime:string|null; fetchedAt:string|null; source:string|null};
    us:{indices:FinanceIndexFact[]; marketTime:string|null; fetchedAt:string|null; source:string|null};
  };
  portfolioFacts:{marketValue:number|null; invested:number; profit:number|null; profitRate:number|null};
  fundFacts:FinanceFundFact[];
  fundRelationshipFacts:FundRelationshipFact[];
  contributionFacts:FinanceContributionFact[];
  trendFacts:{snapshotDays:number; insufficientHistory:boolean; snapshotDataHash:string; ranges:FinanceTrendFact[]};
  dataFreshness:{chinaMarketTime:string|null; usMarketTime:string|null; fundNavDates:Array<{fundCode:string; fundName:string; navDate:string|null; isQdii:boolean}>; snapshotStartDate:string|null; snapshotEndDate:string|null};
  limitations:string[];
  unknownExposure:boolean;
};

export function stableStringify(value:unknown):string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value as Record<string,unknown>).sort(([a],[b])=>a.localeCompare(b)).map(([key,item])=>`${JSON.stringify(key)}:${stableStringify(item)}`).join(",")}}`;
  return JSON.stringify(value);
}

export function hashFinanceAnalysisContext(context:FinanceAnalysisContext) {
  return createHash("sha256").update(stableStringify(context)).digest("hex");
}

export function buildTrendFacts(rows:Array<{snapshot_date:string;total_market_value:number|null;total_profit:number|null}>, today:string):FinanceAnalysisContext["trendFacts"] {
  const ranges = [["7d",7],["30d",30],["90d",90],["365d",365],["all",null]] as const;
  const summaries = ranges.map(([range,days])=>{
    const start=days==null?null:shiftDate(today,-(days-1));
    const selected=rows.filter(row=>start==null||row.snapshot_date>=start);
    const first=selected[0],last=selected.at(-1);
    const enough=selected.length>=2;
    return {range,snapshotDays:selected.length,insufficientHistory:!enough,startDate:first?.snapshot_date??null,endDate:last?.snapshot_date??null,marketValueChange:enough&&first.total_market_value!=null&&last!.total_market_value!=null?Number(last!.total_market_value)-Number(first.total_market_value):null,profitChange:enough&&first.total_profit!=null&&last!.total_profit!=null?Number(last!.total_profit)-Number(first.total_profit):null};
  });
  return {snapshotDays:rows.length,insufficientHistory:rows.length<2,snapshotDataHash:createHash("sha256").update(stableStringify(rows)).digest("hex"),ranges:summaries};
}

function shiftDate(value:string,amount:number) { const date=new Date(`${value}T00:00:00Z`);date.setUTCDate(date.getUTCDate()+amount);return date.toISOString().slice(0,10); }
