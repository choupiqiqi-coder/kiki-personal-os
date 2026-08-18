"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth/current-user";
import { getMarketOverview } from "@/server/market";
import { getUSMarketOverview } from "@/server/market";

export async function refreshMarketAction() {
  const user = await requireUser();
  const result = await getMarketOverview(user.id, { forceRefresh: true });
  revalidatePath("/finance/market");
  revalidatePath("/dashboard");
  const refresh = result.source === "provider" ? "success" : result.source === "cache_stale" ? "stale" : "failed";
  redirect(`/finance/market?refresh=${refresh}`);
}
export async function refreshUSMarketAction(){const user=await requireUser();const result=await getUSMarketOverview(user.id,{forceRefresh:true});revalidatePath("/finance/market/us");redirect(`/finance/market/us?refresh=${result.source==="provider"?"ok":result.source==="cache_stale"?"stale":"failed"}`)}
