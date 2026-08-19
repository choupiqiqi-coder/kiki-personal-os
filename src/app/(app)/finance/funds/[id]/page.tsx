import Link from "next/link";
import { FinanceNav } from "@/components/finance/finance-nav";
import { deleteFundAction, refreshFundAction } from "../../actions";
import { requireUser } from "@/server/auth/current-user";
import { createDataAccess } from "@/server/data";

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ refresh?: string }> }) {
  const { id } = await params;
  const query = await searchParams;
  const user = await requireUser();
  const data = await createDataAccess();
  const fund = await data.funds.get(user.id, id);
  const history = await data.funds.history(user.id, id);
  const isQdii = fund.fund_type?.toUpperCase().includes("QDII") || fund.tags.some((tag) => tag.toUpperCase() === "QDII");
  return <main className="mx-auto max-w-2xl px-4 py-6 pb-28">
    <div className="flex items-end justify-between gap-3"><div><p className="text-sm font-semibold text-primary">{fund.fund_code}</p><h1 className="mt-2 text-3xl font-semibold">{fund.fund_name}</h1></div><Link href={`/finance/funds/${id}/edit`} className="rounded-full bg-surface-muted px-4 py-2 text-sm text-primary">编辑持仓</Link></div><FinanceNav />
    {query.refresh ? <Notice status={query.refresh} /> : null}
    <section className="mt-6 rounded-[2rem] bg-[#173f31] p-6 text-white"><p className="text-sm text-emerald-100">当前持有市值</p><h2 className="mt-2 text-3xl font-semibold">{money(fund.market_value)}</h2><div className="mt-5 grid grid-cols-2 gap-3"><Stat label="总投入" value={money(fund.cost_basis)} /><Stat label="持有收益" value={money(fund.cumulative_return)} /><Stat label="持有收益率" value={percentRatio(fund.return_rate)} /><Stat label="最近净值日收益" value={money(fund.latest_nav_return)} /></div></section>
    <section className="mt-4 rounded-3xl border border-border bg-surface p-5"><div className="flex items-center justify-between"><h2 className="font-semibold">正式基金净值</h2><form action={refreshFundAction.bind(null, id)}><button className="min-h-11 rounded-full bg-primary px-4 text-sm font-semibold text-white">更新净值</button></form></div><dl className="mt-4 grid grid-cols-2 gap-4 text-sm"><Item label="持有份额" value={fund.shares == null ? "—" : Number(fund.shares).toFixed(4)} /><Item label="持仓成本" value={money(fund.cost_basis)} /><Item label="最新单位净值" value={fund.latest_nav == null ? "—" : Number(fund.latest_nav).toFixed(4)} /><Item label="累计净值" value={fund.accumulated_nav == null ? "—" : Number(fund.accumulated_nav).toFixed(4)} /><Item label="正式净值日期" value={fund.nav_date ?? "待获取"} /><Item label="数据来源" value={fund.quote_source ?? "待获取"} /></dl><p className="mt-4 text-xs text-muted-foreground">系统获取时间：{fund.quote_fetched_at ? new Date(fund.quote_fetched_at).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" }) : "—"}</p>{isQdii ? <p className="mt-3 rounded-2xl bg-[#eee5d5] p-3 text-xs leading-5 text-[#745f42]">QDII 正式净值通常滞后一个交易日或更久。页面以明确标注的正式净值日期为准，不会用 NASDAQ-100 等指数涨跌推算基金收益。</p> : null}</section>
    <section className="mt-4 rounded-3xl border border-border bg-surface p-5"><h2 className="font-semibold">正式净值历史</h2>{history.slice(0, 10).map((row) => <div key={row.nav_date} className="mt-3 flex justify-between border-t border-border pt-3 text-sm"><span>{row.nav_date}</span><span>{Number(row.unit_nav).toFixed(4)} · {percent(row.daily_change_percent)}</span></div>)}{!history.length ? <p className="mt-4 text-sm text-muted-foreground">尚无正式净值记录。</p> : null}</section>
    <form action={deleteFundAction.bind(null, id)} className="mt-5"><button className="min-h-12 w-full rounded-2xl border border-red-200 text-sm text-red-700">删除这只基金</button></form>
  </main>;
}

function Notice({ status }: { status: string }) { const text = status === "updated" ? "已保存新公布的正式净值" : status === "current" ? "当前已是最新正式净值" : status === "cached" ? "数据源暂不可用，继续显示最近一次正式净值" : "暂未取得正式净值，可编辑持仓后手动录入"; return <p className="mt-4 rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-900">{text}</p>; }
function Item({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 font-medium">{value}</dd></div>; }
function Stat({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl bg-white/10 p-3"><p className="text-xs text-emerald-100">{label}</p><p className="mt-1 font-semibold">{value}</p></div>; }
function money(value: number | null) { return value == null ? "待净值" : `${Number(value).toFixed(2)} CNY`; }
function percent(value: number | null) { return value == null ? "—" : `${value > 0 ? "+" : ""}${Number(value).toFixed(2)}%`; }
function percentRatio(value: number | null) { return value == null ? "待净值" : percent(Number(value) * 100); }
