import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_CREATOR_PROFILE, normalizeCreatorProfile } from "../src/lib/content/creator-profile.ts";
import { calculateViralityScore } from "../src/lib/content/virality.ts";
import { assertNoCopiedPassages, assertViralAnalysis, type ViralAnalysis } from "../src/lib/content/viral-analysis.ts";

const valid: ViralAnalysis = {
  topic:"装修选材避坑",contentType:"口播",targetAudience:"正在装修的人",
  hook:{text:"这一步没确认，后面返工才是真的贵",type:"loss_aversion",whyItWorks:"把隐蔽成本提前说清"},
  coreConflict:"效果与长期使用成本",painPoint:"用户缺少现场判断依据",informationGap:"关键验收节点容易被忽略",emotionalMechanism:"降低返工焦虑",saveMotivation:"保存为验收清单",commentMotivation:"分享自己的踩坑经历",shareMotivation:"转给同住人与施工方",followPotential:"持续真实工地判断可以建立信任",contentStructure:["提出真实问题","展示判断依据","给出可执行检查"],
  reusablePatterns:[{id:"pattern-1",category:"information_structure",mechanism:"先展示后果再给检查步骤",whyItWorks:"用户能快速理解价值",transferableElements:["后果前置","三步检查"],nonTransferableElements:["原作者措辞","原视频画面"]}],
  avoidCopying:["原文措辞","他人的独特故事"],
  adaptations:[{id:"adapt-1",title:"油工进场前，灯孔为什么要先保护",whyItFitsCreator:"来自真实施工判断",hook:"灯孔不先处理，完工后最容易留下这类细节问题",angle:"从设计完成度解释保护工序",contentPillar:"施工细节",suggestedFormat:"现场口播",structure:["展示现场","解释风险","给检查清单"],reusablePatternIds:["pattern-1"]},{id:"adapt-2",title:"艺术漆别只看样板，现场还要确认三件事",whyItFitsCreator:"结合审美与落地取舍",hook:"同一块艺术漆，为什么上墙后完全不是你想的样子",angle:"拆解光线、基层和施工差异",contentPillar:"材料选择",suggestedFormat:"对比讲解",structure:["效果反差","原因拆解","确认方法"],reusablePatternIds:["pattern-1"]}],dataLimitations:[]
};

test("virality score is deterministic",()=>{assert.equal(calculateViralityScore(84000,10000),8.4);assert.equal(calculateViralityScore(100,0),null);assert.equal(calculateViralityScore(null,10),null);});
test("creator profile falls back to the approved positioning",()=>{const profile=normalizeCreatorProfile(null);assert.equal(profile.accountPositioning,DEFAULT_CREATOR_PROFILE.accountPositioning);assert.ok(profile.contentPillars.includes("装修避坑"));});
test("viral analysis requires 2-3 creator-aligned adaptations",()=>{assert.doesNotThrow(()=>assertViralAnalysis(structuredClone(valid) as unknown as Record<string,unknown>,DEFAULT_CREATOR_PROFILE.contentPillars));assert.throws(()=>assertViralAnalysis({...structuredClone(valid),adaptations:[valid.adaptations[0]]} as unknown as Record<string,unknown>,DEFAULT_CREATOR_PROFILE.contentPillars),/2～3/);});
test("adaptation cannot cite an unknown reusable pattern",()=>{const draft=structuredClone(valid);draft.adaptations[0].reusablePatternIds=["missing"];assert.throws(()=>assertViralAnalysis(draft as unknown as Record<string,unknown>,DEFAULT_CREATOR_PROFILE.contentPillars),/不存在/);});
test("adaptation cannot invent a pillar outside Creator Profile",()=>{const draft=structuredClone(valid);draft.adaptations[0].contentPillar="炒股";assert.throws(()=>assertViralAnalysis(draft as unknown as Record<string,unknown>,DEFAULT_CREATOR_PROFILE.contentPillars),/内容支柱/);});
test("long copied passages are rejected while mechanisms remain reusable",()=>{assert.doesNotThrow(()=>assertNoCopiedPassages(valid,"原文讲的是另一个完全不同的装修经历，没有复用这些连续表达。"));const draft=structuredClone(valid);draft.adaptations[0].hook="装修公司最不希望你知道的灯孔保护完整方法";assert.throws(()=>assertNoCopiedPassages(draft,"装修公司最不希望你知道的灯孔保护完整方法，后面还有其他内容。"),/高度重复/);});
