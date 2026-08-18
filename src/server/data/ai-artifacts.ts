import type { SupabaseClient } from "@supabase/supabase-js";
import { throwDataAccessError } from "./database-error";

export type AiArtifactListItem = {
  id: string;
  artifact_type: string;
  title: string;
  summary: string | null;
  data_as_of: string | null;
  generated_at: string;
};

export type AiArtifactDetail = AiArtifactListItem & {
  run_id: string | null;
  content: Record<string, unknown>;
  version: number;
};

export async function listRecentAiArtifacts(
  client: SupabaseClient,
  userId: string,
  limit = 10,
) {
  const safeLimit = Math.min(Math.max(limit, 1), 50);
  const { data, error } = await client
    .from("ai_artifacts")
    .select("id, artifact_type, title, summary, data_as_of, generated_at")
    .eq("user_id", userId)
    .order("generated_at", { ascending: false })
    .limit(safeLimit)
    .returns<AiArtifactListItem[]>();

  if (error) throwDataAccessError("aiArtifacts.listRecent", error);
  return data;
}

export async function listArtifactsByType(client: SupabaseClient,userId:string,artifactType:string){const {data,error}=await client.from("ai_artifacts").select("id,run_id,artifact_type,title,summary,content,version,data_as_of,generated_at").eq("user_id",userId).eq("artifact_type",artifactType).order("version",{ascending:false}).returns<AiArtifactDetail[]>();if(error)throwDataAccessError("aiArtifacts.listByType",error);return data??[];}

export async function getArtifact(client:SupabaseClient,userId:string,id:string){const {data,error}=await client.from("ai_artifacts").select("id,run_id,artifact_type,title,summary,content,version,data_as_of,generated_at").eq("user_id",userId).eq("id",id).maybeSingle<AiArtifactDetail>();if(error)throwDataAccessError("aiArtifacts.get",error);return data;}

export async function getRun(client:SupabaseClient,userId:string,runId:string){const {data,error}=await client.from("ai_runs").select("id,provider,model,status,input_tokens,output_tokens,total_tokens,latency_ms,error_message,started_at,completed_at").eq("user_id",userId).eq("id",runId).maybeSingle();if(error)throwDataAccessError("aiRuns.get",error);return data;}

export async function getLatestRun(client:SupabaseClient,userId:string){const {data,error}=await client.from("ai_runs").select("id,provider,model,status,input_tokens,output_tokens,total_tokens,latency_ms,error_message,started_at,completed_at").eq("user_id",userId).order("started_at",{ascending:false}).limit(1).maybeSingle();if(error)throwDataAccessError("aiRuns.latest",error);return data;}
