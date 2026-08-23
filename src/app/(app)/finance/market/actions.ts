"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth/current-user";
import { getMarketOverview } from "@/server/market";
import { getUSMarketOverview } from "@/server/market";
import { generateMarketResearch } from "@/server/ai/market-research-service";
import { buildMarketResearchContext } from "@/server/market/research/context-builder";

export async function refreshMarketAction() {
  const user = await requireUser();
  const [result] = await Promise.all([getMarketOverview(user.id, { forceRefresh: true }),buildMarketResearchContext(user.id,{forceRefresh:true})]);
  revalidatePath("/finance/market");
  revalidatePath("/dashboard");
  const refresh = result.source === "provider" || result.source === "cache" ? "success" : result.source === "cache_stale" ? "stale" : "failed";
  redirect(`/finance/market?refresh=${refresh}`);
}
export async function refreshUSMarketAction(){const user=await requireUser();const result=await getUSMarketOverview(user.id,{forceRefresh:true});revalidatePath("/finance/market/us");redirect(`/finance/market/us?refresh=${result.source==="provider"||result.source==="cache"?"ok":result.source==="cache_stale"?"stale":"failed"}`)}
export async function generateMarketResearchAction(){const user=await requireUser();let destination="/finance/market?research=generated";try{const result=await generateMarketResearch(user.id);destination=result.reused?"/finance/market?research=reused":destination;}catch(error){destination=`/finance/market?research=failed&researchError=${encodeURIComponent(error instanceof Error?error.message:"生成失败")}`;}revalidatePath("/finance/market");redirect(destination);}
