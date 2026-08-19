export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EXPECTED = new Map([
  ["000001", "上证指数"],
  ["000300", "沪深300"],
  ["000510", "中证A500"],
]);

type CheckedIndex = {
  code: string;
  name: string;
  value: number;
  changePercent: number;
  marketTime: string;
};

function validate(indices: CheckedIndex[]) {
  if (indices.length !== EXPECTED.size) throw new Error("指数数量不完整");
  for (const item of indices) {
    if (EXPECTED.get(item.code) !== item.name) throw new Error(`指数代码或名称不匹配：${item.code}`);
    if (!Number.isFinite(item.value) || item.value <= 0) throw new Error(`指数点位无效：${item.code}`);
    if (!Number.isFinite(item.changePercent)) throw new Error(`涨跌幅无效：${item.code}`);
    if (!item.marketTime) throw new Error(`行情时间缺失：${item.code}`);
  }
  return indices;
}

async function checkEastmoney() {
  const startedAt = performance.now();
  const url = "https://push2.eastmoney.com/api/qt/ulist.np/get?fltt=2&fields=f2%2Cf3%2Cf4%2Cf12%2Cf13%2Cf14%2Cf124&secids=1.000001%2C1.000300%2C1.000510";
  const response = await fetch(url, {
    cache: "no-store",
    headers: { "User-Agent": "Kiki-Personal-OS/1.0" },
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const payload = (await response.json()) as {
    rc?: number;
    data?: { diff?: Array<{ f2?: number; f3?: number; f12?: string; f14?: string; f124?: number }> };
  };
  if (payload.rc !== 0 || !Array.isArray(payload.data?.diff)) throw new Error("响应结构无效");
  const indices = validate(payload.data.diff.map((item) => ({
    code: String(item.f12 ?? ""),
    name: String(item.f14 ?? ""),
    value: Number(item.f2),
    changePercent: Number(item.f3),
    marketTime: item.f124 ? new Date(item.f124 * 1000).toISOString() : "",
  })));
  return {
    ok: true,
    httpStatus: response.status,
    contentType: response.headers.get("content-type"),
    durationMs: Math.round(performance.now() - startedAt),
    indices,
  };
}

async function checkTencent() {
  const startedAt = performance.now();
  const response = await fetch("https://qt.gtimg.cn/q=sh000001,sh000300,sh000510", {
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const bytes = await response.arrayBuffer();
  const body = new TextDecoder("gbk").decode(bytes);
  const indices = validate(body.trim().split(/;\s*/).filter(Boolean).map((line) => {
    const match = line.match(/^v_sh(\d{6})="(.*)"$/);
    if (!match) throw new Error("腾讯文本格式无效");
    const fields = match[2].split("~");
    return {
      code: match[1],
      name: fields[1] ?? "",
      value: Number(fields[3]),
      changePercent: Number(fields[32]),
      marketTime: fields[30] ?? "",
    };
  }));
  return {
    ok: true,
    httpStatus: response.status,
    contentType: response.headers.get("content-type"),
    durationMs: Math.round(performance.now() - startedAt),
    indices,
  };
}

function failure(reason: unknown) {
  return { ok: false, error: reason instanceof Error ? reason.message : "未知错误" };
}

export async function GET() {
  const [eastmoney, tencent] = await Promise.allSettled([checkEastmoney(), checkTencent()]);
  return Response.json({
    checkedAt: new Date().toISOString(),
    eastmoney: eastmoney.status === "fulfilled" ? eastmoney.value : failure(eastmoney.reason),
    tencent: tencent.status === "fulfilled" ? tencent.value : failure(tencent.reason),
  }, { headers: { "Cache-Control": "no-store" } });
}
