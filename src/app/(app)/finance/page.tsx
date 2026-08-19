import Link from "next/link";
import { FinanceNav } from "@/components/finance/finance-nav";
import { summarizeFundHoldings } from "@/lib/finance/fund-calculations";
import { requireUser } from "@/server/auth/current-user";
import { createDataAccess } from "@/server/data";
import { refreshAllFundNavAction } from "./actions";

type Query = { refresh?: string; updated?: string; current?: string; cached?: string; unavailable?: string };

export default async function Page({ searchParams }: { searchParams: Promise<Query> }) {
  const query = await searchParams;
  const user = await requireUser();
  const data = await createDataAccess();
  const funds = await data.funds.list(user.id);
  const summary = summarizeFundHoldings(funds);
  return <main className="mx-auto max-w-3xl px-4 py-6 pb-28">
    <div className="flex items-end justify-between gap-3"><div><p className="text-sm font-semibold text-primary">WEALTH</p><h1 className="mt-2 text-3xl font-semibold">我的基金</h1></div><Link href="/finance/funds/new" className="rounded-full bg-primary px-4 py-3 text-sm font-semibold text-white">添加基金</Link></div><FinanceNav />
    {query.refresh ? <Notice status={query.refresh} counts={query} /> : null}
    <section className="mt-6 rounded-[2rem] bg-[#173f31] p-6 text-white"><div className="flex items-start justify-between gap-3"><div><p className="text-sm text-emerald-100">当前总市值</p><h2 className="mt-2 text-3xl font-semibold">{money(summary.marketValue)}</h2></div>{funds.length ? <form action={refreshAllFundNavAction}><button className="min-h-11 rounded-full bg-white/12 px-4 text-sm font-semibold">更新净值</button></form> : null}</div><div className="mt-5 grid grid-cols-2 gap-3"><Stat label="总投入" value={money(summary.investedCost)} /><Stat label="持有收益" value={money(summary.holdingProfit)} /><Stat label="持有收益率" value={percentRatio(summary.returnRate)} /><Stat label="最近净值日收益" value={money(summary.latestNavReturn)} /></div></section>
    <section className="mt-5 rounded-3xl border border-border bg-surface p-5"><h2 className="font-semibold">持有基金 · {funds.length} 只</h2>{funds.map((fund) => <Link key={fund.id} href={`/finance/funds/${fund.id}`} className="mt-4 block border-t border-border pt-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-medium">{fund.fund_name}</p><p className="mt-1 text-xs text-muted-foreground">{fund.fund_code} · {fund.fund_type ?? "类型待获取"}</p></div><div className="shrink-0 text-right"><p className="text-sm font-semibold">{money(fund.market_value)}</p><p className="mt-1 text-xs text-muted-foreground">{percentRatio(fund.return_rate)}</p></div></div><div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground"><span>收益 {money(fund.cumulative_return)}</span><span>净值 {fund.latest_nav == null ? "待获取" : Number(fund.latest_nav).toFixed(4)}</span><span>{fund.nav_date ?? "净值日期待获取"}</span></div></Link>)}{!funds.length ? <div className="py-9 text-center"><p className="text-sm text-muted-foreground">还没有基金，添加你在支付宝持有的第一只基金。</p><Link href="/finance/funds/new" className="mt-3 inline-block text-sm font-medium text-primary">添加基金 →</Link></div> : null}</section>
    <p className="mt-4 text-xs leading-5 text-muted-foreground">所有金额由持有份额 × 最新正式单位净值确定性计算。QDII 净值延迟公布属于正常情况，系统不会用指数涨跌推算基金收益。</p>
  </main>;
}

function Notice({ status, counts }: { status: string; counts: Query }) { const text = status === "updated" ? `已取得新正式净值（更新 ${counts.updated ?? 0} 只）` : status === "current" ? "当前已是最新正式净值" : status === "cached" ? "数据源暂不可用，继续显示最近一次正式净值" : "部分基金尚无可用正式净值，可进入详情手动录入"; return <p className="mt-4 rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-900">{text}</p>; }
function Stat({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl bg-white/10 p-3"><p className="text-xs text-emerald-100">{label}</p><p className="mt-1 font-semibold">{value}</p></div>; }
function money(value: number | null) { return value == null ? "待净值" : `${Number(value).toFixed(2)} CNY`; }
function percentRatio(value: number | null) { return value == null ? "待净值" : `${value > 0 ? "+" : ""}${(Number(value) * 100).toFixed(2)}%`; }
