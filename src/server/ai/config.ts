import "server-only";
import type { AiProviderId,AiTaskType,TaskConfig } from "./types";

export const PROVIDER_CONFIG:Record<AiProviderId,{label:string;envKey:string;defaultModel:string}>={
  openai:{label:"OpenAI",envKey:"OPENAI_API_KEY",defaultModel:"gpt-4o-mini"},
  gemini:{label:"Google Gemini",envKey:"GEMINI_API_KEY",defaultModel:"gemini-2.5-flash"},
  anthropic:{label:"Anthropic Claude",envKey:"ANTHROPIC_API_KEY",defaultModel:"claude-sonnet-4-5"},
  deepseek:{label:"DeepSeek",envKey:"DEEPSEEK_API_KEY",defaultModel:"deepseek-chat"},
  custom_openai_compatible:{label:"自定义 OpenAI-compatible",envKey:"AI_CUSTOM_API_KEY",defaultModel:"由环境变量配置"},
};
const providerConfigured=(id:AiProviderId)=>id==="custom_openai_compatible"?Boolean(process.env.AI_CUSTOM_API_KEY&&process.env.AI_CUSTOM_BASE_URL&&process.env.AI_CUSTOM_MODEL):Boolean(process.env[PROVIDER_CONFIG[id].envKey]);
const configuredProvider=(Object.keys(PROVIDER_CONFIG) as AiProviderId[]).find(providerConfigured);
export const DEFAULT_PROVIDER=(process.env.AI_PROVIDER??configuredProvider??"openai") as AiProviderId;
const taskModels:Record<AiProviderId,Record<AiTaskType,string>>={
  openai:{daily_brief:process.env.OPENAI_DAILY_MODEL??"gpt-4o-mini",evening_summary:process.env.OPENAI_DAILY_MODEL??"gpt-4o-mini",viral_material_analysis:process.env.OPENAI_ANALYSIS_MODEL??"gpt-4o",content_review:process.env.OPENAI_ANALYSIS_MODEL??"gpt-4o",finance_analysis:process.env.OPENAI_ANALYSIS_MODEL??"gpt-4o"},
  anthropic:{daily_brief:process.env.ANTHROPIC_DAILY_MODEL??"claude-haiku-4-5",evening_summary:process.env.ANTHROPIC_DAILY_MODEL??"claude-haiku-4-5",viral_material_analysis:process.env.ANTHROPIC_ANALYSIS_MODEL??"claude-sonnet-4-5",content_review:process.env.ANTHROPIC_ANALYSIS_MODEL??"claude-sonnet-4-5",finance_analysis:process.env.ANTHROPIC_ANALYSIS_MODEL??"claude-sonnet-4-5"},
  gemini:{daily_brief:"gemini-2.5-flash",evening_summary:"gemini-2.5-flash",viral_material_analysis:"gemini-2.5-pro",content_review:"gemini-2.5-pro",finance_analysis:"gemini-2.5-pro"},
  deepseek:{daily_brief:"deepseek-chat",evening_summary:"deepseek-chat",viral_material_analysis:"deepseek-reasoner",content_review:"deepseek-reasoner",finance_analysis:"deepseek-reasoner"},
  custom_openai_compatible:{daily_brief:process.env.AI_CUSTOM_MODEL??"未配置",evening_summary:process.env.AI_CUSTOM_MODEL??"未配置",viral_material_analysis:process.env.AI_CUSTOM_MODEL??"未配置",content_review:process.env.AI_CUSTOM_MODEL??"未配置",finance_analysis:process.env.AI_CUSTOM_MODEL??"未配置"},
};
export const TASK_CONFIG:Record<AiTaskType,TaskConfig>={
  daily_brief:{model:taskModels[DEFAULT_PROVIDER].daily_brief,timeoutMs:30000,maxOutputTokens:900,temperature:.4,maxInputChars:10000},
  evening_summary:{model:taskModels[DEFAULT_PROVIDER].evening_summary,timeoutMs:30000,maxOutputTokens:900,temperature:.3,maxInputChars:10000},
  viral_material_analysis:{model:taskModels[DEFAULT_PROVIDER].viral_material_analysis,timeoutMs:45000,maxOutputTokens:1800,temperature:.35,maxInputChars:14000},
  content_review:{model:taskModels[DEFAULT_PROVIDER].content_review,timeoutMs:45000,maxOutputTokens:1400,temperature:.3,maxInputChars:12000},
  finance_analysis:{model:taskModels[DEFAULT_PROVIDER].finance_analysis,timeoutMs:45000,maxOutputTokens:1200,temperature:.2,maxInputChars:12000},
};
export function providerStatus(){return (Object.keys(PROVIDER_CONFIG) as AiProviderId[]).map(id=>({id,label:PROVIDER_CONFIG[id].label,model:id==="custom_openai_compatible"?(process.env.AI_CUSTOM_MODEL??"未配置"):id===DEFAULT_PROVIDER?TASK_CONFIG.daily_brief.model:PROVIDER_CONFIG[id].defaultModel,configured:providerConfigured(id),active:id===DEFAULT_PROVIDER}));}
