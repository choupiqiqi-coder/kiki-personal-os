import "server-only";
import { createClient } from "@/lib/supabase/server";
import { buildDailyAIContext } from "@/server/daily/context";
import { briefSchema, eveningSchema } from "./schemas";
import { execute } from "./service";

export async function generatePhase7DailyBrief(userId: string) {
  const context = await buildDailyAIContext(userId);
  const result = await execute({ userId, task: "daily_brief", title: `AI 每日简报 · ${context.date}`, artifactType: "daily_brief", schema: briefSchema, context, sources: [{ title: "Daily OS 最小上下文", type: "daily_context" }] });
  const client = await createClient();
  await client.from("daily_page_artifacts").upsert({ user_id: userId, daily_page_id: context.daily_page.id, ai_artifact_id: result.artifactId, artifact_role: "morning_brief" }, { onConflict: "daily_page_id,artifact_role,ai_artifact_id" });
  return result;
}

export async function generateEveningSummary(userId: string, dailyPageId: string) {
  const context = await buildDailyAIContext(userId);
  if (context.daily_page.id !== dailyPageId) throw new Error("只能总结当天 Daily Page");
  const client = await createClient();
  const { data: review } = await client.from("daily_reviews").select("id,wins,challenges,learnings,tomorrow_note,energy_level_evening,mood_evening").eq("user_id", userId).eq("daily_page_id", dailyPageId).single();
  const result = await execute({ userId, task: "evening_summary", title: `Evening Summary · ${context.date}`, artifactType: "evening_summary", schema: eveningSchema, context: { ...context, review }, sources: [{ title: "今日聚合事实", type: "daily_context" }, { title: "用户今日复盘", type: "daily_review" }] });
  await client.from("daily_page_artifacts").insert({ user_id: userId, daily_page_id: dailyPageId, ai_artifact_id: result.artifactId, artifact_role: "evening_summary" });
  if (review?.id) await client.from("daily_reviews").update({ ai_artifact_id: result.artifactId }).eq("user_id", userId).eq("id", review.id);
  const proposals = Array.isArray(result.data.memory_proposals) ? result.data.memory_proposals.filter((x): x is string => typeof x === "string").slice(0, 3) : [];
  for (const content of proposals) {
    const { data: memory } = await client.from("memory_items").insert({ user_id: userId, memory_type: "lesson", domain: "global", title: content.slice(0, 80), content, status: "proposed", origin: "ai_extracted", sensitivity: "normal", ai_access: "allowed" }).select("id").single();
    if (memory && review?.id) await client.from("memory_evidence").insert({ user_id: userId, memory_id: memory.id, source_type: "daily_review", source_id: review.id, excerpt: content.slice(0, 300) });
  }
  return result;
}
