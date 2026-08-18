"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getLocalDate } from "@/lib/date";
import { requireUser } from "@/server/auth/current-user";
import { createDataAccess } from "@/server/data";
import type { TaskInput } from "@/server/data/tasks";

function parseTask(formData: FormData): TaskInput {
  const title = String(formData.get("title") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const priorityValue = String(formData.get("priority") ?? "medium");
  const priority = ["low", "medium", "high"].includes(priorityValue)
    ? (priorityValue as TaskInput["priority"])
    : "medium";
  if (!title || title.length > 120) throw new Error("任务标题不能为空且不能超过 120 字。");

  return {
    title,
    notes: notes || null,
    priority,
    scheduledDate: formData.get("isToday") === "on" ? getLocalDate() : null,
  };
}

export async function createTaskAction(formData: FormData) {
  const user = await requireUser();
  const data = await createDataAccess();
  await data.tasks.create(user.id, parseTask(formData));
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  redirect("/tasks");
}

export async function updateTaskAction(taskId: string, formData: FormData) {
  const user = await requireUser();
  const data = await createDataAccess();
  await data.tasks.update(user.id, taskId, parseTask(formData));
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  redirect("/tasks");
}

export async function toggleTaskAction(taskId: string, completed: boolean) {
  const user = await requireUser();
  const data = await createDataAccess();
  await data.tasks.setCompleted(user.id, taskId, !completed);
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
}

export async function deleteTaskAction(taskId: string) {
  const user = await requireUser();
  const data = await createDataAccess();
  await data.tasks.delete(user.id, taskId);
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
}
