import "server-only";
import { marketDailyBriefSchema,validateMarketDailyBrief } from "@/lib/finance/market-research";
import { buildMarketResearchContext } from "@/server/market/research/context-builder";
import { execute } from "./service";
export const MARKET_RESEARCH_ARTIFACT_TYPE="market_research_daily";
export async function generateMarketResearch(userId:string){const{context,contextHash}=await buildMarketResearchContext(userId);const date=context.researchDate;const dataAsOf=[context.dataAsOf.china,context.dataAsOf.us,context.dataAsOf.news,context.dataAsOf.fetchedAt].filter((x):x is string=>Boolean(x)).sort().at(-1)??context.dataAsOf.fetchedAt;return execute({userId,task:"market_research",title:`今日市场解读 · ${date}`,artifactType:MARKET_RESEARCH_ARTIFACT_TYPE,artifactMode:"daily_latest",schema:marketDailyBriefSchema,context,sources:context.sources.map(source=>({title:source.name,url:source.url,type:source.level,dataAsOf:source.publishedAt})),deduplicationKey:`market_research:${userId}:${date}:${contextHash}`,inputHash:contextHash,dataAsOf,processOutput:value=>validateMarketDailyBrief(value,context)});}
