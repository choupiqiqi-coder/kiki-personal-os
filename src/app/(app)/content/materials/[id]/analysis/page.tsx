import Link from "next/link";
import { notFound } from "next/navigation";
import { ViralAnalysisReport } from "@/components/content/viral-analysis-report";
import { normalizeCreatorProfile } from "@/lib/content/creator-profile";
import { calculateViralityScore } from "@/lib/content/virality";
import { assertViralAnalysis, type ViralAnalysis } from "@/lib/content/viral-analysis";
import { providerStatus } from "@/server/ai/config";
import { requireUser } from "@/server/auth/current-user";
import { createDataAccess } from "@/server/data";
import { analyzeMaterialAction, createTopicFromAdaptationAction } from "./actions";

export default async function MaterialAnalysis({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{error?:string}>}) {
  const {id}=await params; const {error}=await searchParams; const user=await requireUser(); const data=await createDataAccess();
  const [item,analyses,assets,profileRow]=await Promise.all([data.content.materials.get(user.id,id),data.content.materials.analyses(user.id,id),data.content.materials.assets(user.id,id),data.profiles.get(user.id)]);
  if(!item)notFound(); const profile=normalizeCreatorProfile(profileRow?.creator_profile); const latest=analyses[0]; let parsed:ViralAnalysis|null=null;
  if(latest){try{assertViralAnalysis(latest.result,profile.contentPillars);parsed=latest.result;}catch{parsed=null;}}
  const active=providerStatus().find(x=>x.active); const virality=calculateViralityScore(item.views,item.author_average_views);
  return <main className="mx-auto w-full max-w-2xl px-4 py-6 pb-28 sm:px-6">
    <Link href="/content/materials" className="text-sm text-muted-foreground">← 返回素材</Link><p className="mt-6 text-sm font-semibold text-violet-700">CONTENT BREAKDOWN</p><h1 className="mt-2 text-3xl font-semibold">{item.title}</h1><p className="mt-2 text-sm text-muted-foreground">{active?.label} · {active?.model} · Creator Profile v{profile.schemaVersion}</p>
    <div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-surface p-4"><p className="text-xs text-muted-foreground">播放量</p><p className="mt-1 font-semibold">{item.views?.toLocaleString("zh-CN")??"未填写"}</p></div><div className="rounded-2xl bg-surface p-4"><p className="text-xs text-muted-foreground">Outlier</p><p className="mt-1 font-semibold">{virality?`${virality}x`:"数据不足"}</p></div><div className="rounded-2xl bg-surface p-4"><p className="text-xs text-muted-foreground">参考截图</p><p className="mt-1 font-semibold">{assets.length} 张</p></div></div>
    {assets.length?<p className="mt-3 text-xs text-muted-foreground">截图已私密保存为参考；当前文本模型仅分析你粘贴的标题与正文，不会假装识图。</p>:null}{error?<div className="mt-5 rounded-2xl bg-red-50 p-4 text-sm text-red-700">分析失败：{error}</div>:null}{!active?.configured?<div className="mt-5 rounded-3xl bg-amber-50 p-5 text-sm text-amber-800">AI Provider 未配置，不会生成假分析。</div>:null}
    <form action={analyzeMaterialAction.bind(null,id)} className="mt-5"><button disabled={!active?.configured||!item.content_snapshot?.trim()} className="min-h-13 w-full rounded-2xl bg-violet-700 font-semibold text-white disabled:opacity-40">{latest?"根据当前素材重新分析":"开始结构化拆解"}</button></form>{!item.content_snapshot?.trim()?<p className="mt-2 text-center text-xs text-amber-700">请先粘贴正文或口播，避免 AI 只看标题猜测。</p>:null}
    {parsed&&latest?<div className="mt-8"><ViralAnalysisReport analysis={parsed} analysisId={latest.id} createTopic={createTopicFromAdaptationAction.bind(null,id)}/><h2 className="mt-7 font-semibold">历史版本</h2><div className="mt-3 space-y-2">{analyses.map(x=><div key={x.id} className="rounded-2xl bg-surface p-4 text-sm">v{x.version} · {new Date(x.created_at).toLocaleString("zh-CN")}</div>)}</div></div>:latest?<div className="mt-7 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">旧版拆解结果无法按 V1 Schema 展示，请重新分析。</div>:null}
  </main>;
}
