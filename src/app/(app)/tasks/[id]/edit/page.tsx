import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TaskForm } from "@/components/tasks/task-form";
import { requireUser } from "@/server/auth/current-user";
import { createDataAccess } from "@/server/data";
import { updateTaskAction } from "../../actions";

export const metadata: Metadata = { title: "编辑任务" };

export default async function EditTaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const data = await createDataAccess();
  const task = await data.tasks.get(user.id, id);
  if (!task) notFound();
  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-6 pb-28 sm:px-6 md:py-10">
      <Link href="/tasks" className="text-sm text-muted-foreground">← 返回任务</Link>
      <h1 className="mt-5 text-3xl font-semibold tracking-[-0.035em]">编辑任务</h1>
      <div className="mt-8"><TaskForm action={updateTaskAction.bind(null, id)} task={task} /></div>
    </main>
  );
}
