import type { SupabaseClient } from "@supabase/supabase-js";
import { throwDataAccessError } from "./database-error";

export type TaskListItem = {
  id: string;
  title: string;
  status: "todo" | "doing" | "done" | "cancelled";
  priority: "low" | "medium" | "high";
  scheduled_date: string | null;
  scheduled_time: string | null;
  due_at: string | null;
  completed_at: string | null;
};

export type TaskRecord = TaskListItem & {
  notes: string | null;
};

export type TaskInput = {
  title: string;
  notes?: string | null;
  priority: "low" | "medium" | "high";
  scheduledDate?: string | null;
};

type ListTasksOptions = {
  userId: string;
  scheduledDate?: string;
};

export async function listTasks(
  client: SupabaseClient,
  { userId, scheduledDate }: ListTasksOptions,
) {
  let query = client
    .from("tasks")
    .select(
      "id, title, status, priority, scheduled_date, scheduled_time, due_at, completed_at",
    )
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("sort_order")
    .order("created_at");

  if (scheduledDate) query = query.eq("scheduled_date", scheduledDate);

  const { data, error } = await query.returns<TaskListItem[]>();
  if (error) throwDataAccessError("tasks.list", error);
  return data;
}

export async function getTask(client: SupabaseClient, userId: string, taskId: string) {
  const { data, error } = await client
    .from("tasks")
    .select(
      "id, title, notes, status, priority, scheduled_date, scheduled_time, due_at, completed_at",
    )
    .eq("user_id", userId)
    .eq("id", taskId)
    .is("deleted_at", null)
    .maybeSingle<TaskRecord>();

  if (error) throwDataAccessError("tasks.get", error);
  return data;
}

export async function createTask(
  client: SupabaseClient,
  userId: string,
  input: TaskInput,
) {
  const { data, error } = await client
    .from("tasks")
    .insert({
      user_id: userId,
      title: input.title,
      notes: input.notes ?? null,
      priority: input.priority,
      scheduled_date: input.scheduledDate ?? null,
    })
    .select("id")
    .single<{ id: string }>();

  if (error) throwDataAccessError("tasks.create", error);
  return data;
}

export async function updateTask(
  client: SupabaseClient,
  userId: string,
  taskId: string,
  input: TaskInput,
) {
  const { error } = await client
    .from("tasks")
    .update({
      title: input.title,
      notes: input.notes ?? null,
      priority: input.priority,
      scheduled_date: input.scheduledDate ?? null,
    })
    .eq("user_id", userId)
    .eq("id", taskId)
    .is("deleted_at", null);

  if (error) throwDataAccessError("tasks.update", error);
}

export async function setTaskCompleted(
  client: SupabaseClient,
  userId: string,
  taskId: string,
  completed: boolean,
) {
  const { error } = await client
    .from("tasks")
    .update({
      status: completed ? "done" : "todo",
      completed_at: completed ? new Date().toISOString() : null,
    })
    .eq("user_id", userId)
    .eq("id", taskId)
    .is("deleted_at", null);

  if (error) throwDataAccessError("tasks.setCompleted", error);
}

export async function deleteTask(client: SupabaseClient, userId: string, taskId: string) {
  const { error } = await client
    .from("tasks")
    .update({ deleted_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("id", taskId)
    .is("deleted_at", null);

  if (error) throwDataAccessError("tasks.delete", error);
}
