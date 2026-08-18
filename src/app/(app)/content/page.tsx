import type { Metadata } from "next";
import Link from "next/link";
import { ContentNav } from "@/components/content/content-nav";
import { getLocalDate } from "@/lib/date";
import { requireUser } from "@/server/auth/current-user";
import { createDataAccess } from "@/server/data";

export const metadata: Metadata = { title: "自媒体" };

export default async function ContentPage() {
  const user=await requireUser(); const data=await createDataAccess();
  const [inspirations,materials,topics,publications,reviews]=await Promise.all([data.content.inspirations.list(user.id,getLocalDate()),data.content.materials.list(user.id),data.content.topics.list(user.id),data.content.publications.list(user.id),data.content.reviews.list(user.id)]);
  const activeTopics=topics.filter((topic)=>!["published","reviewed","archived"].includes(topic.status));
  return <main className="mx-auto w-full max-w-4xl px-4 py-6 pb-28 sm:px-6 md:py-10"><header><p className="text-sm font-semibold text-primary">CONTENT STUDIO</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">自媒体生产中心</h1><p className="mt-2 text-sm text-muted-foreground">灵感 → 素材 → 选题 → 发布 → 数据 → 复盘</p></header><ContentNav path="/content"/><section className="mt-7 grid grid-cols-2 gap-3"><Link href="/content/inspirations/new" className="rounded-3xl bg-[#173f31] p-5 text-white"><span className="text-sm text-emerald-100">快速记录</span><strong className="mt-2 block text-lg">＋ 新增灵感</strong></Link><Link href="/content/topics/new" className="rounded-3xl bg-[#eee5d5] p-5 text-[#5f4827]"><span className="text-sm">直接规划</span><strong className="mt-2 block text-lg">＋ 新增选题</strong></Link></section><section className="mt-5 grid gap-3 sm:grid-cols-2"><Summary href="/content/inspirations" label="今日待处理灵感" value={inspirations.filter(x=>!x.is_completed).length} detail={inspirations[0]?.title}/><Summary href="/content/topics" label="待开发选题" value={activeTopics.length} detail={activeTopics[0]?.title}/><Summary href="/content/materials" label="最近爆款素材" value={materials.length} detail={materials[0]?.title}/><Summary href={publications[0]?`/content/publications/${publications[0].id}`:"/content/topics"} label="最近发布作品" value={publications.length} detail={publications[0]?.title}/><Summary href="/content/reviews" label="最近一次复盘" value={reviews.length} detail={reviews[0]?.manual_summary}/></section></main>;
}
function Summary({href,label,value,detail}:{href:string;label:string;value:number;detail?:string|null}){return <Link href={href} className="rounded-3xl border border-border bg-surface p-5 shadow-sm"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-3xl font-semibold">{value}</p><p className="mt-2 truncate text-sm text-primary">{detail??"暂无记录"} →</p></Link>}
