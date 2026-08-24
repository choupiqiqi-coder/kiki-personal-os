import type { MarketDailyBrief,MarketResearchContext } from "@/lib/finance/market-research";
import type { AiArtifactDetail } from "@/server/data/ai-artifacts";

export function MarketResearchReport({artifact,content,context,run}:{artifact:AiArtifactDetail;content:MarketDailyBrief;context:MarketResearchContext;run:Record<string,unknown>|null}){
  const breadth=context.marketStructure.breadth,turnover=context.marketStructure.turnover;
  return <article className="mt-6 space-y-4">
    <header className="rounded-3xl bg-[#173f31] p-6 text-white"><div className="flex items-center justify-between gap-3"><p className="text-sm text-emerald-100">DAILY MARKET BRIEF · v{artifact.version}</p><span className="rounded-full bg-white/10 px-3 py-1 text-xs">{content.validation.status==="valid"?"事实校验通过":"部分内容已降级"}</span></div><p className="mt-3 text-xs text-emerald-100">今日一句话</p><h2 className="mt-1 text-2xl font-semibold">{content.todayInOneSentence.text}</h2></header>
    <section className="grid grid-cols-2 gap-3 rounded-3xl border border-border bg-surface p-5 sm:grid-cols-4"><Fact label="A股行情" value={context.dataAsOf.china?"已更新":"暂不可用"}/><Fact label="成交额" value={turnover?formatCny(turnover.amountCny):"暂不可用"}/><Fact label="上涨 / 下跌" value={breadth?`${breadth.advancers} / ${breadth.decliners}`:"暂不可用"}/><Fact label="涨停 / 跌停" value={context.marketStructure.limits?`${context.marketStructure.limits.up} / ${context.marketStructure.limits.down}`:"暂不可用"}/></section>
    <Section title="A股发生了什么"><p>{content.chinaMarket.text}</p></Section>
    <Section title="海外与宏观"><div className="space-y-4"><p>{content.overseasAndMacro.text}</p>{content.drivers.possibleDrivers.length?<div><strong className="text-foreground">可能的影响因素</strong><List values={content.drivers.possibleDrivers.map(x=>x.text)}/></div>:null}</div></Section>
    <Section title="和我的基金有什么关系"><p>{content.fundRelationship.text}</p></Section>
    <Section title="接下来关注什么"><div className="space-y-4">{content.watchNext.map((item,index)=><div key={`${index}-${item.item}`}><p className="font-medium text-foreground">{item.item}</p><p>为什么值得关注：{item.whyItMatters}</p><p>关注信号：{item.changesViewWhen}</p></div>)}</div></Section>
    <section className="rounded-3xl bg-[#f1e7d5] p-5 text-[#6f4b18]"><h3 className="font-semibold">数据与风险说明</h3><div className="mt-3 text-sm leading-7"><List values={[...content.unknowns,...content.drivers.unknowns,...content.dataLimitations]}/>{content.validation.warnings.length?<details className="mt-4 border-t border-[#d9c9ad] pt-3"><summary className="cursor-pointer font-medium">本次校验提示 {content.validation.warnings.length} 项</summary><List values={content.validation.warnings}/></details>:null}{run?<p className="mt-4 border-t border-[#d9c9ad] pt-3">{String(run.provider??"—")} · {String(run.model??"—")} · Token {String(run.total_tokens??"—")} · 耗时 {String(run.latency_ms??"—")}ms</p>:null}</div></section>
    <p className="text-center text-xs text-muted-foreground">核心数字来自系统事实层；AI 只负责解释，不构成投资建议。</p>
  </article>;
}
function Section({title,children}:{title:string;children:React.ReactNode}){return <section className="rounded-3xl border border-border bg-surface p-5"><h3 className="font-semibold">{title}</h3><div className="mt-3 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{children}</div></section>}
function List({values}:{values:string[]}){return values.length?<ul className="mt-2 space-y-2">{values.map((value,index)=><li key={`${index}-${value}`} className="flex gap-2"><span className="text-primary">•</span><span>{value}</span></li>)}</ul>:<p className="mt-2">暂无额外限制。</p>}
function Fact({label,value}:{label:string;value:string}){return <div className="rounded-2xl bg-surface-muted p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-semibold">{value}</p></div>}
function formatCny(value:number){return value>=1e12?`${(value/1e12).toFixed(2)} 万亿元`:`${(value/1e8).toFixed(0)} 亿元`}
