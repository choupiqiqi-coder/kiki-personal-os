import Link from "next/link";
import {requireUser} from "@/server/auth/current-user";
import {createDataAccess} from "@/server/data";
import {saveProfileLiteAction} from "../actions";
export default async function Page(){
  const user=await requireUser();const data=await createDataAccess();const p=await data.profiles.get(user.id);
  const fields=[{name:"name",label:"称呼",value:p?.display_name},{name:"positioning",label:"内容定位",value:p?.content_positioning},{name:"audience",label:"目标受众",value:p?.target_audience},{name:"timezone",label:"时区",value:p?.timezone},{name:"morning",label:"晨间开始",value:p?.morning_start_time},{name:"evening",label:"晚间开始",value:p?.evening_start_time}];
  return <main className="mx-auto max-w-2xl px-4 pb-28 pt-6"><Link href="/profile" className="text-sm text-muted-foreground">← 返回</Link><h1 className="mt-6 text-3xl font-semibold">Profile Lite</h1><p className="mt-2 text-sm text-muted-foreground">只维护 Daily OS 和 AI 真正需要的长期偏好。</p><form action={saveProfileLiteAction} className="mt-7 space-y-4">{fields.map(field=><label key={field.name} className="block"><span className="text-sm font-medium">{field.label}</span><input name={field.name} defaultValue={field.value??""} className="mt-2 min-h-12 w-full rounded-2xl border border-border bg-surface px-4"/></label>)}<label className="block"><span className="text-sm font-medium">AI 回答风格</span><select name="style" defaultValue={p?.ai_response_style} className="mt-2 min-h-12 w-full rounded-2xl border border-border bg-surface px-4"><option value="concise">简洁</option><option value="balanced">平衡</option><option value="detailed">详细</option></select></label><button className="min-h-14 w-full rounded-2xl bg-primary font-semibold text-white">保存画像</button></form></main>
}
