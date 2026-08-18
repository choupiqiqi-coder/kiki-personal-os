import Link from "next/link";
import { getLocalDate } from "@/lib/date";
import { requireUser } from "@/server/auth/current-user";
import { createDataAccess } from "@/server/data";

export default async function TrendsPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const query = await searchParams;
  const days = query.range === "all" ? null : Number(query.range ?? 30);
  const today = new Date(`${getLocalDate()}T00:00:00+08:00`).getTime();
  const from = days ? new Date(today - days * 86_400_000).toISOString().slice(0, 10) : undefined;
  const user = await requireUser();
  const data = await createDataAccess();
  const rows = (await data.health.body.list(user.id, from)).reverse();
  const series = [["体重", "weight_kg", "kg"], ["腰围", "waist_cm", "cm"], ["臀围", "hip_cm", "cm"], ["体脂率", "body_fat_percent", "%"]] as const;
  return <main className="mx-auto max-w-3xl px-4 py-6 pb-28"><Link href="/health" className="text-sm text-muted-foreground">← 身体管理</Link><h1 className="my-5 text-3xl font-semibold">身体数据趋势</h1><div className="flex gap-2">{[["7", "7天"], ["30", "30天"], ["90", "90天"], ["all", "全部"]].map(([value, label]) => <Link key={value} href={`/health/trends?range=${value}`} className="rounded-full bg-surface-muted px-4 py-2 text-sm">{label}</Link>)}</div>{rows.length < 2 ? <p className="mt-6 rounded-3xl bg-surface-muted p-8 text-center">暂无足够数据，不插值或伪造趋势。</p> : <div className="mt-6 space-y-5">{series.map(([label, key, unit]) => { const points = rows.filter((item) => item[key] != null); return <section key={key} className="rounded-3xl border border-border bg-surface p-5"><h2 className="font-semibold">{label}</h2>{points.length < 2 ? <p className="mt-3 text-sm text-muted-foreground">暂无足够数据</p> : <div className="mt-4 flex items-end gap-2 overflow-x-auto">{points.map((item, index) => <div key={item.id} className="min-w-14 text-center"><div className="mx-auto w-5 rounded-t bg-primary" style={{ height: `${30 + Number(item[key]) * 0.5}px` }}/><p className="mt-2 text-xs">{String(item[key])}{unit}</p><p className="text-[10px] text-muted-foreground">{index === 0 || index === points.length - 1 ? item.measured_at.slice(5, 10) : ""}</p></div>)}</div>}</section>; })}</div>}</main>;
}
