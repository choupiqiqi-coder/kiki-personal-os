export const HOOK_TYPES = ["benefit_conflict", "counterintuitive", "loss_aversion", "strong_result", "strong_question", "identity", "curiosity_gap", "aesthetic_contrast", "opinion_conflict", "other"] as const;
export const PATTERN_CATEGORIES = ["hook", "conflict", "information_structure", "pacing", "user_psychology"] as const;

const text = { type: "string" } as const;
const stringList = { type: "array", items: text } as const;

export const viralAnalysisSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    topic: text,
    contentType: text,
    targetAudience: text,
    hook: {
      type: "object", additionalProperties: false,
      properties: { text, type: { type: "string", enum: HOOK_TYPES }, whyItWorks: text },
      required: ["text", "type", "whyItWorks"],
    },
    coreConflict: text,
    painPoint: text,
    informationGap: text,
    emotionalMechanism: text,
    saveMotivation: text,
    commentMotivation: text,
    shareMotivation: text,
    followPotential: text,
    contentStructure: stringList,
    reusablePatterns: {
      type: "array", minItems: 1, maxItems: 8,
      items: {
        type: "object", additionalProperties: false,
        properties: { id: text, category: { type: "string", enum: PATTERN_CATEGORIES }, mechanism: text, whyItWorks: text, transferableElements: stringList, nonTransferableElements: stringList },
        required: ["id", "category", "mechanism", "whyItWorks", "transferableElements", "nonTransferableElements"],
      },
    },
    avoidCopying: stringList,
    adaptations: {
      type: "array", minItems: 2, maxItems: 3,
      items: {
        type: "object", additionalProperties: false,
        properties: { id: text, title: text, whyItFitsCreator: text, hook: text, angle: text, contentPillar: text, suggestedFormat: text, structure: stringList, reusablePatternIds: stringList },
        required: ["id", "title", "whyItFitsCreator", "hook", "angle", "contentPillar", "suggestedFormat", "structure", "reusablePatternIds"],
      },
    },
    dataLimitations: stringList,
  },
  required: ["topic", "contentType", "targetAudience", "hook", "coreConflict", "painPoint", "informationGap", "emotionalMechanism", "saveMotivation", "commentMotivation", "shareMotivation", "followPotential", "contentStructure", "reusablePatterns", "avoidCopying", "adaptations", "dataLimitations"],
} as const;

export type ReusablePattern = { id: string; category: typeof PATTERN_CATEGORIES[number]; mechanism: string; whyItWorks: string; transferableElements: string[]; nonTransferableElements: string[] };
export type ViralAdaptation = { id: string; title: string; whyItFitsCreator: string; hook: string; angle: string; contentPillar: string; suggestedFormat: string; structure: string[]; reusablePatternIds: string[] };
export type ViralAnalysis = { topic: string; contentType: string; targetAudience: string; hook: { text: string; type: typeof HOOK_TYPES[number]; whyItWorks: string }; coreConflict: string; painPoint: string; informationGap: string; emotionalMechanism: string; saveMotivation: string; commentMotivation: string; shareMotivation: string; followPotential: string; contentStructure: string[]; reusablePatterns: ReusablePattern[]; avoidCopying: string[]; adaptations: ViralAdaptation[]; dataLimitations: string[] };

function object(value: unknown, label: string): Record<string, unknown> { if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} 格式无效`); return value as Record<string, unknown>; }
function nonEmpty(value: unknown, label: string) { if (typeof value !== "string" || !value.trim()) throw new Error(`${label} 不能为空`); return value.trim(); }
function textArray(value: unknown, label: string) { if (!Array.isArray(value) || value.some(item => typeof item !== "string" || !item.trim())) throw new Error(`${label} 格式无效`); return value as string[]; }

export function assertViralAnalysis(value: Record<string, unknown>, allowedPillars: string[]): asserts value is ViralAnalysis {
  const required = ["topic", "contentType", "targetAudience", "coreConflict", "painPoint", "informationGap", "emotionalMechanism", "saveMotivation", "commentMotivation", "shareMotivation", "followPotential"];
  for (const key of required) nonEmpty(value[key], key);
  const hook = object(value.hook, "hook"); nonEmpty(hook.text, "hook.text"); nonEmpty(hook.whyItWorks, "hook.whyItWorks");
  if (!HOOK_TYPES.includes(hook.type as typeof HOOK_TYPES[number])) throw new Error("hook.type 不在允许范围");
  textArray(value.contentStructure, "contentStructure"); textArray(value.avoidCopying, "avoidCopying"); textArray(value.dataLimitations, "dataLimitations");
  const patterns = Array.isArray(value.reusablePatterns) ? value.reusablePatterns : [];
  if (!patterns.length || patterns.length > 8) throw new Error("reusablePatterns 数量无效");
  const patternIds = new Set<string>();
  for (const item of patterns) { const pattern = object(item, "reusablePattern"); const id = nonEmpty(pattern.id, "reusablePattern.id"); patternIds.add(id); if (!PATTERN_CATEGORIES.includes(pattern.category as typeof PATTERN_CATEGORIES[number])) throw new Error("reusablePattern.category 无效"); nonEmpty(pattern.mechanism, "reusablePattern.mechanism"); nonEmpty(pattern.whyItWorks, "reusablePattern.whyItWorks"); textArray(pattern.transferableElements, "transferableElements"); textArray(pattern.nonTransferableElements, "nonTransferableElements"); }
  const adaptations = Array.isArray(value.adaptations) ? value.adaptations : [];
  if (adaptations.length < 2 || adaptations.length > 3) throw new Error("adaptations 必须为 2～3 个");
  for (const item of adaptations) { const adaptation = object(item, "adaptation"); for (const key of ["id", "title", "whyItFitsCreator", "hook", "angle", "contentPillar", "suggestedFormat"]) nonEmpty(adaptation[key], `adaptation.${key}`); if (!allowedPillars.includes(String(adaptation.contentPillar))) throw new Error("adaptation 使用了 Creator Profile 之外的内容支柱"); textArray(adaptation.structure, "adaptation.structure"); const ids = textArray(adaptation.reusablePatternIds, "adaptation.reusablePatternIds"); if (ids.some(id => !patternIds.has(id))) throw new Error("adaptation 引用了不存在的 reusablePattern"); }
}

const comparable = (value: string) => value.replace(/[\s\p{P}\p{S}]/gu, "").toLowerCase();

export function assertNoCopiedPassages(analysis: ViralAnalysis, sourceText: string, minimumLength = 18) {
  const source = comparable(sourceText);
  if (source.length < minimumLength) return;
  const outputs = analysis.adaptations.flatMap(item => [item.title, item.hook, item.angle, ...item.structure]);
  for (const output of outputs) {
    const candidate = comparable(output);
    if (candidate.length < minimumLength) continue;
    for (let index = 0; index <= candidate.length - minimumLength; index += 1) {
      if (source.includes(candidate.slice(index, index + minimumLength))) throw new Error("二创方向包含与原素材高度重复的连续措辞");
    }
  }
}
