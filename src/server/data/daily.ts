import type { SupabaseClient } from "@supabase/supabase-js";
import { throwDataAccessError } from "./database-error";
import {transitionDailyState,type DailyEvent,type DailyWorkflowState} from "@/lib/daily/state-machine";

export type DailyPageRecord = {
  id: string;
  page_date: string;
  workflow_state: "not_started" | "morning_planning" | "active_day" | "evening_review" | "completed";
  intention: string | null;
  energy_level_morning:number|null;
  mood_morning:number|null;
};

export type FocusItemRecord = {
  id: string;
  title: string;
  item_type: "task" | "fitness" | "media" | "learning" | "custom";
  source_id: string | null;
  status: "planned" | "done" | "skipped";
  sort_order: number;
};

export type DailyReviewRecord = {
  wins: string | null;
  challenges: string | null;
  learnings: string | null;
  tomorrow_note: string | null;
  energy_level_evening: number | null;
  mood_evening: number | null;
  ai_artifact_id?: string | null;
};

export async function getOrCreateDailyPage(
  client: SupabaseClient,
  userId: string,
  date: string,
) {
  const { data: existing, error: readError } = await client
    .from("daily_pages")
    .select("id, page_date, workflow_state, intention, energy_level_morning, mood_morning")
    .eq("user_id", userId)
    .eq("page_date", date)
    .maybeSingle<DailyPageRecord>();
  if (readError) throwDataAccessError("daily.get", readError);
  if (existing) return existing;

  const { data, error } = await client
    .from("daily_pages")
    .insert({ user_id: userId, page_date: date })
    .select("id, page_date, workflow_state, intention, energy_level_morning, mood_morning")
    .single<DailyPageRecord>();
  if (error) throwDataAccessError("daily.create", error);
  return data;
}

export async function saveMorningState(client:SupabaseClient,userId:string,dailyPageId:string,input:{intention:string|null;energy:number|null;mood:number|null}){const{error}=await client.from("daily_pages").update({intention:input.intention,energy_level_morning:input.energy,mood_morning:input.mood,last_activity_at:new Date().toISOString()}).eq("user_id",userId).eq("id",dailyPageId);if(error)throwDataAccessError("daily.morning.save",error)}
export async function applyDailyEvent(client:SupabaseClient,userId:string,dailyPageId:string,event:DailyEvent){const{data,error}=await client.from("daily_pages").select("workflow_state").eq("user_id",userId).eq("id",dailyPageId).single<{workflow_state:DailyWorkflowState}>();if(error||!data)throwDataAccessError("daily.transition.get",error??{message:"Daily Page 不存在"});const next=transitionDailyState(data.workflow_state,event);const now=new Date().toISOString();const timestamps:Record<string,string>={};if(event==="complete_morning")timestamps.morning_completed_at=now;if(event==="skip_morning")timestamps.morning_skipped_at=now;if(event==="complete_evening")timestamps.evening_completed_at=now;if(event==="skip_evening")timestamps.evening_skipped_at=now;const updated=await client.from("daily_pages").update({workflow_state:next,last_activity_at:now,...timestamps}).eq("user_id",userId).eq("id",dailyPageId);if(updated.error)throwDataAccessError("daily.transition.save",updated.error);return next}

export async function replaceFocusItems(client:SupabaseClient,userId:string,dailyPageId:string,items:Array<{title:string;itemType:"task"|"fitness"|"media"|"learning"|"custom";sourceId:string|null;origin?:"user"|"ai_suggested"}>){const limited=items.slice(0,3);const removed=await client.from("daily_focus_items").delete().eq("user_id",userId).eq("daily_page_id",dailyPageId);if(removed.error)throwDataAccessError("daily.focus.clearAll",removed.error);if(!limited.length)return;const saved=await client.from("daily_focus_items").insert(limited.map((item,index)=>({user_id:userId,daily_page_id:dailyPageId,title:item.title,item_type:item.itemType,source_id:item.sourceId,origin:item.origin??"user",sort_order:index,source_snapshot:{title:item.title}})));if(saved.error)throwDataAccessError("daily.focus.saveAll",saved.error)}

export async function listFocusItems(
  client: SupabaseClient,
  userId: string,
  dailyPageId: string,
) {
  const { data, error } = await client
    .from("daily_focus_items")
    .select("id, title, item_type, source_id, status, sort_order")
    .eq("user_id", userId)
    .eq("daily_page_id", dailyPageId)
    .order("sort_order")
    .returns<FocusItemRecord[]>();
  if (error) throwDataAccessError("daily.focus.list", error);
  return data;
}

export async function replaceTaskFocusItems(
  client: SupabaseClient,
  userId: string,
  dailyPageId: string,
  items: Array<{ taskId: string; title: string }>,
) {
  const { error: deleteError } = await client
    .from("daily_focus_items")
    .delete()
    .eq("user_id", userId)
    .eq("daily_page_id", dailyPageId)
    .eq("item_type", "task");
  if (deleteError) throwDataAccessError("daily.focus.clear", deleteError);

  if (items.length) {
    const { error } = await client.from("daily_focus_items").insert(
      items.map((item, index) => ({
        user_id: userId,
        daily_page_id: dailyPageId,
        title: item.title,
        item_type: "task",
        source_id: item.taskId,
        origin: "user",
        sort_order: index,
      })),
    );
    if (error) throwDataAccessError("daily.focus.save", error);
  }

}

export async function getDailyReview(
  client: SupabaseClient,
  userId: string,
  dailyPageId: string,
) {
  const { data, error } = await client
    .from("daily_reviews")
    .select("wins, challenges, learnings, tomorrow_note, energy_level_evening, mood_evening, ai_artifact_id")
    .eq("user_id", userId)
    .eq("daily_page_id", dailyPageId)
    .maybeSingle<DailyReviewRecord>();
  if (error) throwDataAccessError("daily.review.get", error);
  return data;
}

export async function saveDailyReview(
  client: SupabaseClient,
  userId: string,
  dailyPageId: string,
  input: DailyReviewRecord,
) {
  const { error } = await client.from("daily_reviews").upsert(
    {
      user_id: userId,
      daily_page_id: dailyPageId,
      wins: input.wins,
      challenges: input.challenges,
      learnings: input.learnings,
      tomorrow_note: input.tomorrow_note,
      energy_level_evening: input.energy_level_evening,
      mood_evening: input.mood_evening,
    },
    { onConflict: "daily_page_id" },
  );
  if (error) throwDataAccessError("daily.review.save", error);

}
