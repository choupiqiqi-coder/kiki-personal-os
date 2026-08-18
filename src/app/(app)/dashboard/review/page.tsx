import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { saveReviewAction } from "../actions";
import { getLocalDate, formatChineseDate } from "@/lib/date";
import { requireUser } from "@/server/auth/current-user";
import { createDataAccess } from "@/server/data";

export const metadata: Metadata = { title: "今日复盘" };

export default async function DailyReviewPage() {
  const user = await requireUser();
  const data = await createDataAccess();
  const profile = await data.profiles.get(user.id);
  const date = getLocalDate(profile?.timezone);
  const dailyPage = await data.daily.getOrCreate(user.id, date);
  if (dailyPage.workflow_state !== "evening_review" && dailyPage.workflow_state !== "completed") redirect("/dashboard");
  const review = await data.daily.getReview(user.id, dailyPage.id);
  const action = saveReviewAction.bind(null, dailyPage.id);

  return (
    <main className="mx-auto w-full max-w-2xl px-4 pb-28 pt-6 sm:px-6">
      <Link href="/dashboard" className="text-sm text-muted-foreground">← 返回今天</Link>
      <p className="mt-7 text-sm font-medium text-primary">Evening Review · {formatChineseDate(date)}</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">把今天轻轻收好</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">不追求完美记录，只留下明天真正用得上的信息。</p>
      <form action={action} className="mt-8 space-y-5">
        <label className="block rounded-3xl border border-border bg-surface p-5 shadow-sm"><span className="text-base font-semibold">今天做得好的事</span><textarea name="wins" defaultValue={review?.wins ?? ""} rows={3} placeholder="哪怕只完成了一件重要的小事…" className="mt-3 w-full resize-none rounded-2xl bg-surface-muted px-4 py-3 outline-none ring-primary focus:ring-2" /></label>
        <label className="block rounded-3xl border border-border bg-surface p-5 shadow-sm"><span className="text-base font-semibold">遇到的阻力</span><textarea name="challenges" defaultValue={review?.challenges ?? ""} rows={3} placeholder="什么消耗了精力或影响了进度？" className="mt-3 w-full resize-none rounded-2xl bg-surface-muted px-4 py-3 outline-none ring-primary focus:ring-2" /></label>
        <label className="block rounded-3xl border border-border bg-surface p-5 shadow-sm"><span className="text-base font-semibold">今天学到什么</span><textarea name="learnings" defaultValue={review?.learnings ?? ""} rows={3} placeholder="值得长期记住的经验或判断…" className="mt-3 w-full resize-none rounded-2xl bg-surface-muted px-4 py-3 outline-none ring-primary focus:ring-2" /></label>
        <label className="block rounded-3xl border border-border bg-surface p-5 shadow-sm"><span className="text-base font-semibold">留给明天</span><textarea name="tomorrowNote" defaultValue={review?.tomorrow_note ?? ""} rows={3} placeholder="明天醒来，第一件值得做的事…" className="mt-3 w-full resize-none rounded-2xl bg-surface-muted px-4 py-3 outline-none ring-primary focus:ring-2" /></label>
        <fieldset className="rounded-3xl border border-border bg-surface p-5 shadow-sm"><legend className="px-1 text-base font-semibold">今晚的状态</legend><div className="mt-3 grid grid-cols-5 gap-2">{[1, 2, 3, 4, 5].map((mood) => <label key={mood} className="cursor-pointer"><input className="peer sr-only" type="radio" name="mood" value={mood} defaultChecked={review?.mood_evening === mood} /><span className="flex h-12 items-center justify-center rounded-2xl bg-surface-muted text-sm peer-checked:bg-primary peer-checked:text-white">{mood}</span></label>)}</div></fieldset>
        <fieldset className="rounded-3xl border border-border bg-surface p-5 shadow-sm"><legend className="px-1 text-base font-semibold">今晚的精力</legend><div className="mt-3 grid grid-cols-5 gap-2">{[1, 2, 3, 4, 5].map((energy) => <label key={energy} className="cursor-pointer"><input className="peer sr-only" type="radio" name="energy" value={energy} defaultChecked={review?.energy_level_evening === energy} /><span className="flex h-12 items-center justify-center rounded-2xl bg-surface-muted text-sm peer-checked:bg-primary peer-checked:text-white">{energy}</span></label>)}</div></fieldset>
        <button className="min-h-14 w-full rounded-2xl bg-primary px-5 font-semibold text-primary-foreground shadow-sm" type="submit">保存今日复盘</button>
      </form>
    </main>
  );
}
