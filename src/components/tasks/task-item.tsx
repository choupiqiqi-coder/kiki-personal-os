import Link from "next/link";
import type { TaskListItem } from "@/server/data/tasks";
import { deleteTaskAction, toggleTaskAction } from "@/app/(app)/tasks/actions";

export function TaskItem({ task }: { task: TaskListItem }) {
  const completed = task.status === "done";
  return (
    <article className="flex items-start gap-3 rounded-3xl border border-border bg-surface p-4 shadow-[0_1px_2px_rgba(24,32,28,0.03)]">
      <form action={toggleTaskAction.bind(null, task.id, completed)}>
        <button aria-label={completed ? "标记为未完成" : "完成任务"}
          className={`mt-0.5 flex size-8 items-center justify-center rounded-full border text-lg font-bold transition active:scale-90 ${completed ? "border-emerald-600 bg-emerald-600 text-white" : "border-border bg-background text-transparent hover:border-primary"}`}>
          ✓
        </button>
      </form>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className={`font-medium leading-7 ${completed ? "text-muted-foreground line-through" : ""}`}>{task.title}</h2>
            <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span>{task.scheduled_date ? "今日任务" : "普通任务"}</span><span>·</span>
              <span>{task.priority === "high" ? "高优先级" : task.priority === "low" ? "低优先级" : "中优先级"}</span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Link href={`/tasks/${task.id}/edit`} className="flex min-h-10 items-center rounded-xl px-3 text-sm text-muted-foreground hover:bg-surface-muted">编辑</Link>
            <form action={deleteTaskAction.bind(null, task.id)}>
              <button className="min-h-10 rounded-xl px-3 text-sm text-red-500 hover:bg-red-50">删除</button>
            </form>
          </div>
        </div>
      </div>
    </article>
  );
}
