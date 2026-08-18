import type { SupabaseClient } from "@supabase/supabase-js";
import { throwDataAccessError } from "./database-error";

export type ContentOverview = {
  inspirations: number;
  materials: number;
  activeTopics: number;
  publications: number;
};

export async function getContentOverview(
  client: SupabaseClient,
  userId: string,
): Promise<ContentOverview> {
  const [inspirations, materials, topics, publications] = await Promise.all([
    client
      .from("media_inspirations")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("deleted_at", null),
    client
      .from("media_viral_materials")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("deleted_at", null),
    client
      .from("media_topics")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .not("status", "in", '("published","archived")')
      .is("deleted_at", null),
    client
      .from("media_publications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("deleted_at", null),
  ]);

  const failed = [inspirations, materials, topics, publications].find(
    (result) => result.error,
  );
  if (failed?.error) throwDataAccessError("content.getOverview", failed.error);

  return {
    inspirations: inspirations.count ?? 0,
    materials: materials.count ?? 0,
    activeTopics: topics.count ?? 0,
    publications: publications.count ?? 0,
  };
}
