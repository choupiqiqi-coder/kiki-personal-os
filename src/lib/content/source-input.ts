export type ParsedContentSource = {
  sourceUrl: string | null;
  platform: "douyin" | "xiaohongshu" | null;
};

const URL_PATTERN = /https?:\/\/[^\s<>"'，。；：！？）》】…]+/gi;
const TRAILING_PUNCTUATION = /[),.;:!?\]}，。；：！？）》】…]+$/u;

function normalizeHttpUrl(candidate: string) {
  const trimmed = candidate.trim().replace(TRAILING_PUNCTUATION, "");
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

function detectPlatform(url: string) {
  const hostname = new URL(url).hostname.toLowerCase();
  if (hostname === "douyin.com" || hostname.endsWith(".douyin.com")) return "douyin" as const;
  if (
    hostname === "xiaohongshu.com" ||
    hostname.endsWith(".xiaohongshu.com") ||
    hostname === "xhslink.com" ||
    hostname.endsWith(".xhslink.com")
  ) return "xiaohongshu" as const;
  return null;
}

export function parseContentSourceInput(input: string): ParsedContentSource {
  for (const match of input.matchAll(URL_PATTERN)) {
    const sourceUrl = normalizeHttpUrl(match[0]);
    if (sourceUrl) return { sourceUrl, platform: detectPlatform(sourceUrl) };
  }
  return { sourceUrl: null, platform: null };
}
