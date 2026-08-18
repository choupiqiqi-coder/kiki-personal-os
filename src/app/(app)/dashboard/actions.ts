"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth/current-user";
import { createDataAccess } from "@/server/data";
import {getLocalDate} from "@/lib/date";
import {generateEveningSummary} from "@/server/ai/daily-service";

export async function saveFocusAction(dailyPageId: string, formData: FormData) {
  const user = await requireUser();
  const data = await createDataAccess();
  const selectedIds = formData.getAll("taskId").map(String).slice(0, 3);
  const tasks = await data.tasks.list(user.id);
  const selected = selectedIds
    .map((id) => tasks.find((task) => task.id === id))
    .filter((task): task is NonNullable<typeof task> => Boolean(task))
    .map((task) => ({ taskId: task.id, title: task.title }));

  await data.daily.replaceTaskFocus(user.id, dailyPageId, selected);
  revalidatePath("/dashboard");
}

export async function startMorningAction(dailyPageId:string){const user=await requireUser();const data=await createDataAccess();await data.daily.transition(user.id,dailyPageId,"start_morning");revalidatePath("/dashboard")}
export async function skipMorningAction(dailyPageId:string){const user=await requireUser();const data=await createDataAccess();await data.daily.transition(user.id,dailyPageId,"skip_morning");revalidatePath("/dashboard")}
export async function completeMorningAction(dailyPageId:string,formData:FormData){const user=await requireUser();const data=await createDataAccess();const selectedIds=formData.getAll("taskId").map(String).slice(0,3);const tasks=await data.tasks.list(user.id);const selected=selectedIds.map(id=>tasks.find(task=>task.id===id)).filter((task):task is NonNullable<typeof task>=>Boolean(task)).map(task=>({title:task.title,itemType:"task" as const,sourceId:task.id}));const level=(name:string)=>{const value=Number(formData.get(name));return Number.isInteger(value)&&value>=1&&value<=5?value:null};await data.daily.saveMorning(user.id,dailyPageId,{intention:String(formData.get("intention")??"").trim()||null,energy:level("energy"),mood:level("mood")});await data.daily.replaceFocus(user.id,dailyPageId,selected);await data.daily.transition(user.id,dailyPageId,"complete_morning");revalidatePath("/dashboard")}
export async function startEveningAction(dailyPageId:string){const user=await requireUser();const data=await createDataAccess();await data.daily.transition(user.id,dailyPageId,"start_evening");revalidatePath("/dashboard");redirect("/dashboard/review")}
export async function skipEveningAction(dailyPageId:string){const user=await requireUser();const data=await createDataAccess();await data.daily.transition(user.id,dailyPageId,"skip_evening");revalidatePath("/dashboard")}

export async function saveReviewAction(dailyPageId: string, formData: FormData) {
  const user = await requireUser();
  const data = await createDataAccess();
  const moodValue = Number(formData.get("mood"));
  const profile=await data.profiles.get(user.id);const page=await data.daily.getOrCreate(user.id,getLocalDate(profile?.timezone));
  if(page.id!==dailyPageId||!["active_day","evening_review","completed"].includes(page.workflow_state))redirect("/dashboard");

  await data.daily.saveReview(user.id, dailyPageId, {
    wins: String(formData.get("wins") ?? "").trim() || null,
    challenges: String(formData.get("challenges") ?? "").trim() || null,
    learnings: String(formData.get("learnings") ?? "").trim() || null,
    tomorrow_note: String(formData.get("tomorrowNote") ?? "").trim() || null,
    energy_level_evening: Number.isInteger(Number(formData.get("energy"))) && Number(formData.get("energy")) >= 1 && Number(formData.get("energy")) <= 5 ? Number(formData.get("energy")) : null,
    mood_evening: Number.isInteger(moodValue) && moodValue >= 1 && moodValue <= 5 ? moodValue : null,
  });
  if(page.id===dailyPageId&&page.workflow_state==="active_day")await data.daily.transition(user.id,dailyPageId,"start_evening");
  const refreshed=await data.daily.getOrCreate(user.id,page.page_date);
  if(refreshed.id===dailyPageId&&refreshed.workflow_state==="evening_review")await data.daily.transition(user.id,dailyPageId,"complete_evening");

  let summary="ready";try{await generateEveningSummary(user.id,dailyPageId)}catch{summary="unavailable"}
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/review");
  revalidatePath("/profile/memory");
  redirect(`/dashboard?review=saved&summary=${summary}`);
}
