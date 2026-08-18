"use server";import { revalidatePath } from "next/cache";import { redirect } from "next/navigation";import { requireUser } from "@/server/auth/current-user";import { createDataAccess } from "@/server/data";
async function ctx(){return{user:await requireUser(),data:await createDataAccess()}}const refresh=()=>{revalidatePath("/learning","layout");revalidatePath("/dashboard")};
export async function saveCategoryAction(id:string|null,form:FormData){const{user,data}=await ctx();await data.learning.categories.save(user.id,id,String(form.get("name")??""));refresh();redirect("/learning/categories")}
export async function deleteCategoryAction(id:string){const{user,data}=await ctx();await data.learning.categories.remove(user.id,id);refresh()}
export async function saveSkillAction(id:string|null,form:FormData){const{user,data}=await ctx();await data.learning.skills.save(user.id,id,form);refresh();redirect("/learning")}
export async function deleteSkillAction(id:string){const{user,data}=await ctx();await data.learning.skills.remove(user.id,id);refresh();redirect("/learning")}
export async function saveLogAction(id:string|null,form:FormData){const{user,data}=await ctx();const skillId=String(form.get("skillId")??"");await data.learning.logs.save(user.id,id,form);refresh();redirect(`/learning/skills/${skillId}`)}
export async function deleteLogAction(id:string){const{user,data}=await ctx();await data.learning.logs.remove(user.id,id);refresh()}
export async function saveTutorialAction(id:string|null,form:FormData){const{user,data}=await ctx();await data.learning.tutorials.save(user.id,id,form);refresh();redirect("/learning/tutorials")}
export async function toggleTutorialAction(id:string,value:boolean){const{user,data}=await ctx();await data.learning.tutorials.toggle(user.id,id,value);refresh()}
export async function deleteTutorialAction(id:string){const{user,data}=await ctx();await data.learning.tutorials.remove(user.id,id);refresh()}
export async function saveNoteAction(id:string|null,form:FormData){const{user,data}=await ctx();const skillId=String(form.get("skillId")??"");await data.learning.notes.save(user.id,id,form);refresh();redirect(`/learning/skills/${skillId}`)}
export async function favoriteNoteAction(id:string,value:boolean){const{user,data}=await ctx();await data.learning.notes.favorite(user.id,id,value);refresh()}
export async function deleteNoteAction(id:string){const{user,data}=await ctx();await data.learning.notes.remove(user.id,id);refresh()}
