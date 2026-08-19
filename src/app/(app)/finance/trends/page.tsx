import Link from "next/link";
import { FinanceNav } from "@/components/finance/finance-nav";
import { FundTrendChart } from "@/components/finance/fund-trend-chart";
import { summarizeFundHoldings } from "@/lib/finance/fund-calculations";
import { requireUser } from "@/server/auth/current-user";
import { createDataAccess } from "@/server/data";
import { shanghaiDate } from "@/server/data/fund-trends";

const ranges = [{ value: "7", label: "7天" }, { value: "30", label: "30天" }, { value: "90", label: "90天" }, { value: "365", label: "365天" }, { value: "all", label: "全部" }];

export default async function TrendsPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const query = await searchParams;
  const range = ranges.some((item) => item.value === query.range) ? query.range! : "30";
  const user = await requireUser();
  const data = await createDataAccess();
  const [funds, snapshots] = await Promise.all([data.funds.list(user.id), data.fundTrends.list(user.id, sinceDate(range))]);
  const current = summarizeFundHoldings(funds);
  const contributions = funds.map((fund) => ({ ...fund, contribution: fund.cumulative_return == null ? null : Number(fund.cumulative_return), assetShare: current.marketValue && fund.market_value != null ? Number(fund.market_value) / current.marketValue : null })).sort((a, b) => (b.contribution ?? -Infinity) - (a.contribution ?? -Infinity));
  const maxContribution = Math.max(1, ...contributions.map((fund) => Math.abs(fund.contribution ?? 0)));
  const enoughHistory = snapshots.length >= 2;

  return <main className="mx-auto max-w-3xl px-4 py-6 pb-28">
    <p className="text-sm font-semibold text-primary">WEALTH TREND</p><h1 className="mt-2 text-3xl font-semibold">收益趋势</h1><FinanceNav />
    <div className="mt-5 flex gap-2 overflow-x-auto pb-1">{ranges.map((item) => <Link key={item.value} href={`/finance/trends?range=${item.value}`} className={`shrink-0 rounded-full px-4 py-2 text-sm ${range === item.value ? "bg-primary text-white" : "bg-surface-muted text-primary"}`}>{item.label}</Link>)}</div>
    <section className="mt-5 rounded-[2rem] bg-[#173f31] p-6 text-white"><p className="text-sm text-emerald-100">当前总市值 · CNY</p><h2 className="mt-2 text-3xl font-semibold">{money(current.marketValue)}</h2><div className="mt-5 grid grid-cols-2 gap-3"><Stat label="累计投入" value={money(current.investedCost)} /><Stat label="累计收益" value={money(current.holdingProfit)} /><Stat label="累计收益率" value={percentRatio(current.returnRate)} /><Stat label="真实快照" value={`${snapshots.length} 天`} /></div></section>
    {!enoughHistory ? <section className="mt-5 rounded-3xl bg-surface-muted p-8 text-center"><h2 className="font-semibold">暂无足够历史快照</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">收益趋势会随着正式净值更新逐步积累。历史日期保持空白，不补点、不插值。</p>{snapshots[0] ? <p className="mt-3 text-xs text-muted-foreground">已从 {snapshots[0].snapshot_date} 开始记录</p> : null}</section> : <>
      <section className="mt-5 rounded-3xl border border-border bg-surface p-5"><p className="text-sm text-primary">总资产走势</p><h2 className="mt-1 text-xl font-semibold">市值与投入本金</h2><FundTrendChart points={snapshots.map((row) => ({ date: row.snapshot_date, values: [numberOrNull(row.total_market_value), Number(row.total_invested)] }))} series={[{ label: "基金总市值", color: "#176b4c" }, { label: "累计投入本金", color: "#b28b52" }]} /></section>
      <section className="mt-5 rounded-3xl border border-border bg-surface p-5"><p className="text-sm text-primary">累计收益走势</p><h2 className="mt-1 text-xl font-semibold">真实收益金额</h2><FundTrendChart points={snapshots.map((row) => ({ date: row.snapshot_date, values: [numberOrNull(row.total_profit)] }))} series={[{ label: "累计收益", color: "#176b4c" }]} /></section>
    </>}
    <section className="mt-5 rounded-3xl border border-border bg-surface p-5"><p className="text-sm text-primary">基金收益贡献</p><h2 className="mt-1 text-xl font-semibold">谁在贡献，谁在拖累</h2><div className="mt-4 space-y-5">{contributions.map((fund) => <Link key={fund.id} href={`/finance/funds/${fund.id}`} className="block border-t border-border pt-4 first:border-0 first:pt-0"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-medium">{fund.fund_name}</p><p className="mt-1 text-xs text-muted-foreground">{fund.fund_code} · 占总资产 {percentRatio(fund.assetShare)}</p></div><div className="shrink-0 text-right"><p className="font-semibold">{money(fund.contribution)}</p><p className="mt-1 text-xs text-muted-foreground">{percentRatio(fund.return_rate)}</p></div></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-muted"><div className={`h-full rounded-full ${Number(fund.contribution) >= 0 ? "bg-primary" : "bg-[#b28b52]"}`} style={{ width: `${Math.max(2, Math.abs(fund.contribution ?? 0) / maxContribution * 100)}%` }} /></div><p className="mt-2 text-xs text-muted-foreground">当前市值 {money(fund.market_value)} · 对组合收益贡献 {money(fund.contribution)}</p></Link>)}{!contributions.length ? <p className="py-6 text-center text-sm text-muted-foreground">尚无基金持仓。</p> : null}</div></section>
    <p className="mt-4 text-xs leading-5 text-muted-foreground">趋势仅使用 Supabase 中已经保存的真实组合快照。QDII 保留其正式净值日期，不使用市场指数推算或补齐收益。</p>
  </main>;
}

function sinceDate(range: string) { if (range === "all") return undefined; const date = new Date(`${shanghaiDate()}T00:00:00Z`); date.setUTCDate(date.getUTCDate() - Math.max(0, Number(range) - 1)); return date.toISOString().slice(0, 10); }
function numberOrNull(value: number | null) { return value == null ? null : Number(value); }
function money(value: number | null) { return value == null ? "待正式净值" : `${Number(value).toFixed(2)} CNY`; }
function percentRatio(value: number | null) { return value == null ? "—" : `${value > 0 ? "+" : ""}${(Number(value) * 100).toFixed(2)}%`; }
function Stat({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl bg-white/10 p-3"><p className="text-xs text-emerald-100">{label}</p><p className="mt-1 font-semibold">{value}</p></div>; }
