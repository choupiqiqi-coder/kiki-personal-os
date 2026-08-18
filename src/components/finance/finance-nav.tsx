import Link from "next/link";
const items = [["/finance/market", "今日市场"], ["/finance", "我的基金"], ["/finance/trends", "收益趋势"], ["/finance/analysis", "AI 分析"]];
export function FinanceNav() { return <nav aria-label="财富导航" className="mt-5 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{items.map(([href, label]) => <Link key={href} href={href} className="shrink-0 rounded-full bg-surface-muted px-4 py-2 text-sm text-primary">{label}</Link>)}</nav>; }
