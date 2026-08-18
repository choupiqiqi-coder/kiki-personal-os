import type { SupabaseClient } from "@supabase/supabase-js";
import { throwDataAccessError } from "./database-error";
export type MemoryRecord={id:string;title:string;content:string;domain:string;memory_type:string;status:"proposed"|"active"|"forgotten"|"superseded"|"expired";origin:string;created_at:string};
export async function listMemories(client:SupabaseClient,userId:string){const{data,error}=await client.from("memory_items").select("id,title,content,domain,memory_type,status,origin,created_at").eq("user_id",userId).is("deleted_at",null).in("status",["proposed","active"]).order("created_at",{ascending:false}).returns<MemoryRecord[]>();if(error)throwDataAccessError("memory.list",error);return data}
export async function setMemoryStatus(client:SupabaseClient,userId:string,id:string,status:"active"|"forgotten"){const{error}=await client.from("memory_items").update({status}).eq("user_id",userId).eq("id",id);if(error)throwDataAccessError("memory.status",error)}
