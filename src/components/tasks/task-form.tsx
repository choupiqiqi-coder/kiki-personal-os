import type { TaskRecord } from "@/server/data/tasks";

type TaskFormProps = {
  action: (formData: FormData) => Promise<void>;
  task?: TaskRecord;
};

export function TaskForm({ action, task }: TaskFormProps) {
  return (
    <form action={action} className="space-y-6">
      <label className="block">
        <span className="mb-2 block text-sm font-medium">任务名称</span>
        <input name="title" required maxLength={120} defaultValue={task?.title} autoFocus
          className="min-h-13 w-full rounded-2xl border border-border bg-surface px-4 outline-none transition focus:border-primary focus:ring-3 focus:ring-primary/10"
          placeholder="今天最重要的事情" />
      </label>
      <label className="block">
        <span className="mb-2 block text-sm font-medium">备注</span>
        <textarea name="notes" rows={4} defaultValue={task?.notes ?? ""}
          className="w-full resize-none rounded-2xl border border-border bg-surface px-4 py-3 outline-none transition focus:border-primary focus:ring-3 focus:ring-primary/10"
          placeholder="可选" />
      </label>
      <label className="block">
        <span className="mb-2 block text-sm font-medium">优先级</span>
        <select name="priority" defaultValue={task?.priority ?? "medium"}
          className="min-h-13 w-full rounded-2xl border border-border bg-surface px-4 outline-none">
          <option value="low">低</option>
          <option value="medium">中</option>
          <option value="high">高</option>
        </select>
      </label>
      <label className="flex min-h-14 items-center justify-between rounded-2xl border border-border bg-surface px-4">
        <span>
          <span className="block font-medium">安排到今天</span>
          <span className="text-sm text-muted-foreground">关闭后保存为普通任务</span>
        </span>
        <input name="isToday" type="checkbox" defaultChecked={Boolean(task?.scheduled_date)}
          className="size-5 accent-primary" />
      </label>
      <button className="min-h-13 w-full rounded-2xl bg-primary px-5 font-semibold text-primary-foreground transition active:scale-[0.99]">
        {task ? "保存修改" : "创建任务"}
      </button>
    </form>
  );
}
