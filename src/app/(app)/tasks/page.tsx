import type { Metadata } from "next";
import Link from "next/link";
import { TaskItem } from "@/components/tasks/task-item";
import { getLocalDate } from "@/lib/date";
import { requireUser } from "@/server/auth/current-user";
import { createDataAccess } from "@/server/data";

export const metadata: Metadata = { title: "任务" };

type TasksPageProps = { searchParams: Promise<{ view?: string }> };

export default async function TasksPage({ searchParams }: TasksPageProps) {
  const user = await requireUser();
  const { view } = await searchParams;
  const todayOnly = view !== "all";
  const data = await createDataAccess();
  const tasks = await data.tasks.list(user.id, todayOnly ? getLocalDate() : undefined);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 pb-28 sm:px-6 md:py-10">
      <header className="flex items-end justify-between gap-4">
        <div><p className="text-sm font-semibold text-primary">TASKS</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em]">任务</h1></div>
        <Link href="/tasks/new" className="flex min-h-12 items-center rounded-2xl bg-primary px-5 font-semibold text-primary-foreground shadow-sm active:scale-[0.98]">＋ 新任务</Link>
      </header>
      <div className="mt-8 inline-flex rounded-2xl bg-surface-muted p-1">
        <Link href="/tasks" className={`rounded-xl px-5 py-2.5 text-sm font-medium ${todayOnly ? "bg-surface shadow-sm" : "text-muted-foreground"}`}>今日任务</Link>
        <Link href="/tasks?view=all" className={`rounded-xl px-5 py-2.5 text-sm font-medium ${!todayOnly ? "bg-surface shadow-sm" : "text-muted-foreground"}`}>全部任务</Link>
      </div>
      <section className="mt-6 space-y-3">
        {tasks.length ? tasks.map((task) => <TaskItem key={task.id} task={task} />) : (
          <div className="rounded-3xl border border-dashed border-border px-6 py-14 text-center">
            <p className="text-lg font-medium">这里很安静</p>
            <p className="mt-2 text-sm text-muted-foreground">{todayOnly ? "为今天安排一个真正重要的任务。" : "创建你的第一个任务。"}</p>
          </div>
        )}
      </section>
    </main>
  );
}
