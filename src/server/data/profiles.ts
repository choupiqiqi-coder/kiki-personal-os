import type { SupabaseClient } from "@supabase/supabase-js";
import { throwDataAccessError } from "./database-error";
import type { CreatorProfile } from "@/lib/content/creator-profile";

export type ProfileRecord = {
  id: string;
  display_name: string | null;
  timezone: string;
  locale: string;
  morning_start_time: string;
  evening_start_time: string;
  content_positioning: string | null;
  target_audience: string | null;
  ai_response_style: "concise" | "balanced" | "detailed";
  creator_profile: CreatorProfile | Record<string, never>;
  onboarding_completed_at: string | null;
};

export async function getProfile(client: SupabaseClient, userId: string) {
  const { data, error } = await client
    .from("profiles")
    .select(
      "id, display_name, timezone, locale, morning_start_time, evening_start_time, content_positioning, target_audience, ai_response_style, creator_profile, onboarding_completed_at",
    )
    .eq("id", userId)
    .maybeSingle<ProfileRecord>();

  if (error) throwDataAccessError("profiles.get", error);
  return data;
}

export async function updateProfileLite(client:SupabaseClient,userId:string,input:Pick<ProfileRecord,"display_name"|"timezone"|"morning_start_time"|"evening_start_time"|"content_positioning"|"target_audience"|"ai_response_style">){const{error}=await client.from("profiles").update(input).eq("id",userId);if(error)throwDataAccessError("profiles.updateLite",error)}

export async function updateCreatorProfile(client:SupabaseClient,userId:string,creatorProfile:CreatorProfile){const{error}=await client.from("profiles").update({creator_profile:creatorProfile,content_positioning:creatorProfile.accountPositioning,target_audience:creatorProfile.targetAudience.join("、")}).eq("id",userId);if(error)throwDataAccessError("profiles.updateCreatorProfile",error)}
