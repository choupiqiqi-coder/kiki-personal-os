"use server";
import { revalidatePath } from "next/cache";import { redirect } from "next/navigation";import { requireUser } from "@/server/auth/current-user";import { generatePhase7DailyBrief as generateDailyBrief } from "@/server/ai/daily-service";
export async function generateDailyBriefAction(){const user=await requireUser();try{await generateDailyBrief(user.id);}catch(error){const message=error instanceof Error?error.message:"生成失败";redirect(`/ai?error=${encodeURIComponent(message)}`);}revalidatePath("/ai");revalidatePath("/dashboard");redirect("/ai?generated=1");}
