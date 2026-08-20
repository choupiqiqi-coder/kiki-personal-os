"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth/current-user";
import { generateFinanceAnalysis } from "@/server/ai/finance-service";

export async function generateFinanceAnalysisAction(){
  const user=await requireUser();
  let destination="/finance/analysis?generated=1";
  try{const result=await generateFinanceAnalysis(user.id);destination=result.reused?"/finance/analysis?reused=1":destination;}
  catch(error){destination=`/finance/analysis?error=${encodeURIComponent(error instanceof Error?error.message:"生成失败")}`;}
  revalidatePath("/finance/analysis");
  redirect(destination);
}
