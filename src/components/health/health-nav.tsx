import Link from "next/link";
const items=[['/health','今日'],['/health/body','体态'],['/health/water','饮水'],['/health/periods','周期'],['/health/nutrition','饮食'],['/health/exercise','运动'],['/health/history','历史']];
export function HealthNav(){return <nav className="mt-5 flex gap-2 overflow-x-auto pb-1">{items.map(([href,label])=><Link key={href} href={href} className="shrink-0 rounded-full bg-surface-muted px-4 py-2 text-sm text-primary">{label}</Link>)}</nav>}
