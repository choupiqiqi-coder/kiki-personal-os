import Link from "next/link";
import { LearningNav } from "@/components/learning/learning-nav";
import { requireUser } from "@/server/auth/current-user";
import { createDataAccess } from "@/server/data";
import { deleteTutorialAction, toggleTutorialAction } from "../actions";

export default async function TutorialsPage({ searchParams }: { searchParams: Promise<{ q?: string; skillId?: string }> }) {
  const filters = await searchParams;
  const user = await requireUser();
  const data = await createDataAccess();
  const [tutorials, skills] = await Promise.all([
    data.learning.tutorials.list(user.id, filters.skillId, filters.q),
    data.learning.skills.list(user.id),
  ]);
  const skillNames = new Map(skills.map((skill) => [skill.id, skill.name]));

  return <main className="mx-auto w-full max-w-3xl px-4 py-6 pb-28">
    <header className="flex items-start justify-between gap-4"><div><Link href="/learning" className="text-sm text-muted-foreground">← 学习中心</Link><h1 className="mt-2 text-3xl font-semibold">教程收藏</h1><p className="mt-2 text-sm text-muted-foreground">把值得反复看的内容收进来。</p></div><Link href="/learning/tutorials/new" className="shrink-0 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white">＋ 收藏</Link></header>
    <LearningNav />
    <form className="mt-5 grid grid-cols-2 gap-2"><input name="q" defaultValue={filters.q} placeholder="搜索标题或标签" className="min-h-12 rounded-2xl border border-border px-3"/><select name="skillId" defaultValue={filters.skillId ?? ""} className="rounded-2xl border border-border px-3"><option value="">全部技能</option>{skills.map((skill) => <option key={skill.id} value={skill.id}>{skill.name}</option>)}</select><button className="col-span-2 min-h-11 rounded-2xl bg-surface-muted text-sm font-medium">筛选</button></form>
    <section className="mt-5 space-y-3">{tutorials.length ? tutorials.map((item) => <article key={item.id} className="rounded-3xl border border-border bg-surface p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="text-xs text-muted-foreground">{item.platform ?? "未填写平台"}{item.skill_id ? ` · ${skillNames.get(item.skill_id) ?? "关联技能"}` : ""}</p><h2 className="mt-1 font-semibold">{item.title}</h2></div><span className={item.is_learned ? "text-lg text-emerald-600" : "text-sm text-muted-foreground"}>{item.is_learned ? "✓" : "未学习"}</span></div>{item.tags.length ? <p className="mt-3 text-xs text-muted-foreground">{item.tags.map((tag) => `#${tag}`).join("  ")}</p> : null}<div className="mt-4 flex flex-wrap gap-3 text-sm">{item.url ? <a href={item.url} target="_blank" rel="noreferrer" className="font-medium text-primary">打开原教程 ↗</a> : null}<Link href={`/learning/tutorials/${item.id}/edit`} className="text-primary">编辑</Link><form action={toggleTutorialAction.bind(null, item.id, item.is_learned)}><button className="text-primary">{item.is_learned ? "标记未学习" : "标记已学习"}</button></form><form action={deleteTutorialAction.bind(null, item.id)}><button className="text-red-500">删除</button></form></div></article>) : <div className="rounded-3xl bg-surface-muted p-8 text-center text-sm text-muted-foreground">还没有收藏教程。</div>}</section>
  </main>;
}
