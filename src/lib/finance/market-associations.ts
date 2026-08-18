import type { MarketBreadth, MarketMood, SectorPerformance } from "@/server/market/types";

const aliases: Record<string, string[]> = {
  科技: ["科技", "计算机", "电子", "软件"], CPO: ["CPO", "光模块", "通信"],
  新能源: ["新能源", "光伏", "储能", "电力设备"], 宽基: ["宽基", "沪深300", "中证A500"], 海外: ["海外", "美股", "港股"],
};
export type FundMarketAssociation = { tag: string; direction: "strong" | "weak" | "mixed"; sectors: string[] };
export function calculateMarketMood(breadth: MarketBreadth): MarketMood {
  const active = breadth.advancing + breadth.declining;
  if (!active) return "sideways";
  const advancingShare = breadth.advancing / active;
  if (advancingShare >= 0.56) return "strong";
  if (advancingShare <= 0.44) return "weak";
  return "sideways";
}
export function associateFundTags(tags: string[], sectors: SectorPerformance[]): FundMarketAssociation[] {
  return [...new Set(tags)].flatMap((tag) => {
    const needles = aliases[tag] ?? [tag];
    const matches = sectors.filter((sector) => needles.some((needle) => sector.name.toLowerCase().includes(needle.toLowerCase())));
    if (!matches.length) return [];
    const average = matches.reduce((sum, item) => sum + item.changePercent, 0) / matches.length;
    return [{ tag, direction: average > 0.3 ? "strong" : average < -0.3 ? "weak" : "mixed", sectors: matches.map((item) => item.name) }];
  });
}
