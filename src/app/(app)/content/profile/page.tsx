import { ContentNav } from "@/components/content/content-nav";
import { CreatorProfileForm } from "@/components/content/creator-profile-form";
import { normalizeCreatorProfile } from "@/lib/content/creator-profile";
import { requireUser } from "@/server/auth/current-user";
import { createDataAccess } from "@/server/data";
import { saveCreatorProfileAction } from "./actions";

export default async function CreatorProfilePage() {
  const user = await requireUser();
  const data = await createDataAccess();
  const profile = await data.profiles.get(user.id);
  return <main className="mx-auto w-full max-w-2xl px-4 py-6 pb-28 sm:px-6">
    <p className="text-sm font-semibold text-primary">CONTENT OS</p>
    <h1 className="mt-2 text-3xl font-semibold">Creator Profile</h1>
    <p className="mt-2 text-sm text-muted-foreground">统一账号定位、受众和创作边界，供所有内容 AI 复用。</p>
    <ContentNav path="/content/profile"/>
    <div className="mt-7 rounded-3xl bg-surface p-5 sm:p-7"><CreatorProfileForm action={saveCreatorProfileAction} profile={normalizeCreatorProfile(profile?.creator_profile)}/></div>
  </main>;
}
