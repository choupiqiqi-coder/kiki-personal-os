import type { Metadata } from "next";
import Link from "next/link";
import { TaskForm } from "@/components/tasks/task-form";
import { createTaskAction } from "../actions";

export const metadata: Metadata = { title: "新建任务" };

export default function NewTaskPage() {
  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-6 pb-28 sm:px-6 md:py-10">
      <Link href="/tasks" className="text-sm text-muted-foreground">← 返回任务</Link>
      <h1 className="mt-5 text-3xl font-semibold tracking-[-0.035em]">新建任务</h1>
      <div className="mt-8"><TaskForm action={createTaskAction} /></div>
    </main>
  );
}
