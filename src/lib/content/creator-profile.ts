export type CreatorProfile = {
  schemaVersion: "1";
  accountPositioning: string;
  targetAudience: string[];
  tone: { traits: string[]; writingGuidelines: string[] };
  contentPillars: string[];
  strengths: string[];
  preferredFormats: string[];
  avoidPatterns: string[];
};

export const DEFAULT_CREATOR_PROFILE: CreatorProfile = {
  schemaVersion: "1",
  accountPositioning: "家居装修 + 设计师视角 + 真实装修决策",
  targetAudience: ["正在装修的人", "准备装修的人", "重视设计和品质的人"],
  tone: {
    traits: ["真实", "有审美", "有观点", "信息密度高", "不端着", "不像广告"],
    writingGuidelines: ["讲清真实过程与取舍", "用普通人能理解的语言表达设计判断"],
  },
  contentPillars: ["装修避坑", "材料选择", "施工细节", "家电", "智能家居", "设计观点", "装修决策"],
  strengths: ["真实装修过程", "设计师视角", "材料与参数研究", "真实判断和取舍"],
  preferredFormats: ["口播", "装修过程记录", "选材对比", "施工细节讲解"],
  avoidPatterns: ["纯广告", "无观点产品介绍", "只晒效果", "空洞鸡汤", "直接照搬他人文案"],
};

const strings = (value: unknown, fallback: string[]) =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : fallback;

export function normalizeCreatorProfile(value: unknown): CreatorProfile {
  const source = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const tone = source.tone && typeof source.tone === "object" ? source.tone as Record<string, unknown> : {};
  return {
    schemaVersion: "1",
    accountPositioning: typeof source.accountPositioning === "string" && source.accountPositioning.trim() ? source.accountPositioning.trim() : DEFAULT_CREATOR_PROFILE.accountPositioning,
    targetAudience: strings(source.targetAudience, DEFAULT_CREATOR_PROFILE.targetAudience),
    tone: {
      traits: strings(tone.traits, DEFAULT_CREATOR_PROFILE.tone.traits),
      writingGuidelines: strings(tone.writingGuidelines, DEFAULT_CREATOR_PROFILE.tone.writingGuidelines),
    },
    contentPillars: strings(source.contentPillars, DEFAULT_CREATOR_PROFILE.contentPillars),
    strengths: strings(source.strengths, DEFAULT_CREATOR_PROFILE.strengths),
    preferredFormats: strings(source.preferredFormats, DEFAULT_CREATOR_PROFILE.preferredFormats),
    avoidPatterns: strings(source.avoidPatterns, DEFAULT_CREATOR_PROFILE.avoidPatterns),
  };
}
