import assert from "node:assert/strict";
import test from "node:test";
import type { ChinaMarketProvider, MarketOverview } from "../src/server/market/types.ts";
import { marketFailureResult, shouldUseMarketCache } from "../src/server/market/cache-policy.ts";
import { CompositeChinaMarketProvider } from "../src/server/market/providers/composite.ts";

const overview: MarketOverview = {
  indices: [
    { code: "000001", name: "上证指数", value: 3500, changePercent: 0.1, dataTime: "2026-08-19T07:00:00.000Z" },
    { code: "000300", name: "沪深300", value: 4100, changePercent: 0.2, dataTime: "2026-08-19T07:00:00.000Z" },
    { code: "000510", name: "中证A500", value: 5000, changePercent: -0.1, dataTime: "2026-08-19T07:00:00.000Z" },
  ],
  sectors: [], provider: "fallback", source: "fallback",
  dataTime: "2026-08-19T07:00:00.000Z", fetchedAt: "2026-08-19T07:00:01.000Z",
};

test("China composite uses fallback after primary failure", async () => {
  const primary: ChinaMarketProvider = { id: "primary", async getMarketOverview() { throw new Error("primary down"); } };
  const fallback: ChinaMarketProvider = { id: "fallback", async getMarketOverview() { return overview; } };
  const result = await new CompositeChinaMarketProvider(primary, fallback).getMarketOverview();
  assert.equal(result.provider, "fallback");
});

test("China composite fails after both providers fail", async () => {
  const failed = (id: string): ChinaMarketProvider => ({ id, async getMarketOverview() { throw new Error(`${id} down`); } });
  await assert.rejects(() => new CompositeChinaMarketProvider(failed("primary"), failed("fallback")).getMarketOverview(), /Primary 与 Fallback/);
});

test("manual refresh is debounced for 30 seconds", () => {
  const now = new Date("2026-08-19T07:00:20.000Z");
  assert.equal(shouldUseMarketCache({ fetchedAt: "2026-08-19T07:00:00.000Z", forceRefresh: true, marketOpen: true, now }), true);
  assert.equal(shouldUseMarketCache({ fetchedAt: "2026-08-19T06:59:49.000Z", forceRefresh: true, marketOpen: true, now }), false);
});

test("trading and closed-market TTL differ", () => {
  const now = new Date("2026-08-19T07:06:00.000Z");
  assert.equal(shouldUseMarketCache({ fetchedAt: "2026-08-19T07:00:00.000Z", forceRefresh: false, marketOpen: true, now }), false);
  assert.equal(shouldUseMarketCache({ fetchedAt: "2026-08-19T07:00:00.000Z", forceRefresh: false, marketOpen: false, now }), true);
});

test("provider failure returns the latest valid snapshot without affecting another market", () => {
  const result = marketFailureResult(overview, "A 股", "both providers down");
  assert.equal(result.source, "cache_stale");
  assert.equal(result.data, overview);
  assert.match(result.message, /最近有效数据/);
});
