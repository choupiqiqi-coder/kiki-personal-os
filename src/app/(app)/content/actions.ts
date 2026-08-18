"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getLocalDate } from "@/lib/date";
import { requireUser } from "@/server/auth/current-user";
import { createDataAccess } from "@/server/data";

const refresh=()=>{ revalidatePath("/content","layout"); revalidatePath("/dashboard"); };
async function context(){ return {user:await requireUser(),data:await createDataAccess()}; }

export async function saveInspirationAction(id:string|null,form:FormData){ const {user,data}=await context(); await data.content.inspirations.save(user.id,id,form,getLocalDate()); refresh(); redirect("/content/inspirations"); }
export async function toggleInspirationAction(id:string,value:boolean){ const {user,data}=await context(); await data.content.inspirations.toggle(user.id,id,value); refresh(); }
export async function deleteInspirationAction(id:string){ const {user,data}=await context(); await data.content.inspirations.remove(user.id,id); refresh(); }
export async function convertInspirationAction(id:string){ const {user,data}=await context(); const topicId=await data.content.inspirations.convert(user.id,id); refresh(); redirect(`/content/topics/${topicId}/edit`); }

export async function saveMaterialAction(id:string|null,form:FormData){ const {user,data}=await context(); await data.content.materials.save(user.id,id,form); refresh(); redirect("/content/materials"); }
export async function favoriteMaterialAction(id:string,value:boolean){ const {user,data}=await context(); await data.content.materials.favorite(user.id,id,value); refresh(); }
export async function deleteMaterialAction(id:string){ const {user,data}=await context(); await data.content.materials.remove(user.id,id); refresh(); }
export async function convertMaterialAction(id:string){ const {user,data}=await context(); const topicId=await data.content.materials.convert(user.id,id); refresh(); redirect(`/content/topics/${topicId}/edit`); }

export async function saveTopicAction(id:string|null,form:FormData){ const {user,data}=await context(); const topicId=await data.content.topics.save(user.id,id,form); refresh(); redirect(`/content/topics/${topicId}`); }
export async function favoriteTopicAction(id:string,value:boolean){ const {user,data}=await context(); await data.content.topics.favorite(user.id,id,value); refresh(); }
export async function deleteTopicAction(id:string){ const {user,data}=await context(); await data.content.topics.remove(user.id,id); refresh(); redirect("/content/topics"); }

export async function publishTopicAction(topicId:string,form:FormData){ const {user,data}=await context(); const topic=await data.content.topics.get(user.id,topicId); if(!topic) throw new Error("选题不存在"); const publicationId=await data.content.publications.publish(user.id,topic,form); refresh(); redirect(`/content/publications/${publicationId}`); }
export async function addMetricAction(publicationId:string,form:FormData){ const {user,data}=await context(); await data.content.publications.addMetric(user.id,publicationId,form); refresh(); redirect(`/content/publications/${publicationId}`); }
export async function saveReviewAction(publicationId:string,form:FormData){ const {user,data}=await context(); const publication=await data.content.publications.get(user.id,publicationId); if(!publication) throw new Error("发布记录不存在"); const metrics=await data.content.publications.metrics(user.id,publicationId); await data.content.reviews.save(user.id,publication,metrics[0]?.id??null,form); refresh(); redirect(`/content/publications/${publicationId}`); }
