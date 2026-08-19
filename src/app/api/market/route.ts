import { NextRequest, NextResponse } from "next/server";
import { getChinaMarketProvider, getUSIndexMarketProvider } from "@/server/market";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

export async function GET(request: NextRequest) {
  const market = request.nextUrl.searchParams.get("market") ?? "china";
  const startedAt = Date.now();
  try {
    if (market === "china") {
      const data = await getChinaMarketProvider().getMarketOverview();
      return NextResponse.json({ ...data, durationMs: Date.now() - startedAt }, { headers: noStoreHeaders() });
    }
    if (market === "us") {
      const data = await getUSIndexMarketProvider().getUSMarketOverview();
      return NextResponse.json({ ...data, durationMs: Date.now() - startedAt }, { headers: noStoreHeaders() });
    }
    return NextResponse.json({ error: "market 仅支持 china 或 us" }, { status: 400, headers: noStoreHeaders() });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "行情获取失败",
      market,
      durationMs: Date.now() - startedAt,
    }, { status: 502, headers: noStoreHeaders() });
  }
}

function noStoreHeaders() {
  return { "Cache-Control": "no-store, max-age=0" };
}
