"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { calculateMetCalories, MET_VALUES } from "@/lib/health/calculations";
import { requireUser } from "@/server/auth/current-user";
import { createDataAccess } from "@/server/data";
async function ctx(){return{user:await requireUser(),data:await createDataAccess()}}function refresh(){revalidatePath("/health","layout");revalidatePath("/dashboard")}
export async function saveSettingsAction(form:FormData){const{user,data}=await ctx();await data.health.settings.save(user.id,form);refresh();redirect("/health")}
export async function saveBodyAction(id:string|null,form:FormData){const{user,data}=await ctx();const measurementId=await data.health.body.save(user.id,id,form);for(const view of ["front","side","back"]){const file=form.get(`${view}Photo`);if(file instanceof File&&file.size)await data.health.photos.upload(user.id,measurementId,view,file)}refresh();redirect(`/health/body/${measurementId}`)}
export async function deleteBodyAction(id:string){const{user,data}=await ctx();const photos=await data.health.photos.list(user.id,id,false);for(const photo of photos)await data.health.photos.remove(user.id,photo.id);await data.health.body.remove(user.id,id);refresh();redirect("/health/body")}
export async function deletePhotoAction(id:string,measurementId:string){const{user,data}=await ctx();await data.health.photos.remove(user.id,id);refresh();revalidatePath(`/health/body/${measurementId}`)}
export async function saveWaterAction(id:string|null,form:FormData){const{user,data}=await ctx();await data.health.water.save(user.id,id,Number(form.get("amountMl")),String(form.get("loggedAt")||new Date().toISOString()),id?"manual":"quick_add");refresh()}
export async function deleteWaterAction(id:string){const{user,data}=await ctx();await data.health.water.remove(user.id,id);refresh()}
export async function savePeriodAction(id:string|null,form:FormData){const{user,data}=await ctx();await data.health.periods.save(user.id,id,form);refresh();redirect("/health/periods")}
export async function deletePeriodAction(id:string){const{user,data}=await ctx();await data.health.periods.remove(user.id,id);refresh()}
export async function saveFoodAction(id:string|null,form:FormData){const{user,data}=await ctx();await data.health.foods.save(user.id,id,form);refresh();redirect("/health/nutrition/foods")}
export async function deleteFoodAction(id:string){const{user,data}=await ctx();await data.health.foods.remove(user.id,id);refresh()}
export async function saveMealAction(form:FormData){const{user,data}=await ctx();await data.health.meals.save(user.id,form);refresh();redirect(`/health/nutrition?date=${form.get("date")}`)}
export async function deleteMealAction(id:string){const{user,data}=await ctx();await data.health.meals.remove(user.id,id);refresh()}
export async function saveExerciseAction(form:FormData){const{user,data}=await ctx();const localStart=String(form.get("startedAt")??"");if(localStart&&!/[zZ]|[+-]\d\d:\d\d$/.test(localStart))form.set("startedAt",`${localStart}:00+08:00`);if(form.get("calorieSource")==="met_estimate"){const type=String(form.get("exerciseType")) as keyof typeof MET_VALUES;const met=MET_VALUES[type];if(!met)throw new Error("该运动没有维护 MET，请手动输入消耗");const settings=await data.health.settings.get(user.id);const body=await data.health.body.list(user.id);const weight=body[0]?.weight_kg??settings?.weight_kg;const kcal=calculateMetCalories({met,weightKg:weight,durationMinutes:Number(form.get("durationMinutes"))});if(kcal==null)throw new Error("请先在身体设置中填写体重");form.set("metValue",String(met));form.set("caloriesKcal",String(kcal))}await data.health.exercises.save(user.id,form);refresh();redirect("/health/exercise")}
export async function deleteExerciseAction(id:string){const{user,data}=await ctx();await data.health.exercises.remove(user.id,id);refresh()}
