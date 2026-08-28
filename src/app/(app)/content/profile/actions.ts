"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { CreatorProfile } from "@/lib/content/creator-profile";
import { requireUser } from "@/server/auth/current-user";
import { createDataAccess } from "@/server/data";

const list = (form: FormData, name: string) => String(form.get(name) ?? "").split(/\r?\n|，|,/).map(item => item.trim()).filter(Boolean);

export async function saveCreatorProfileAction(form: FormData) {
  const user = await requireUser();
  const data = await createDataAccess();
  const profile: CreatorProfile = {
    schemaVersion: "1",
    accountPositioning: String(form.get("accountPositioning") ?? "").trim(),
    targetAudience: list(form, "targetAudience"),
    tone: { traits: list(form, "toneTraits"), writingGuidelines: list(form, "writingGuidelines") },
    contentPillars: list(form, "contentPillars"),
    strengths: list(form, "strengths"),
    preferredFormats: list(form, "preferredFormats"),
    avoidPatterns: list(form, "avoidPatterns"),
  };
  if (!profile.accountPositioning || !profile.targetAudience.length || !profile.contentPillars.length || !profile.avoidPatterns.length) throw new Error("Creator Profile 必填项不完整");
  await data.profiles.updateCreator(user.id, profile);
  revalidatePath("/content", "layout");
  redirect("/content/profile?saved=1");
}
