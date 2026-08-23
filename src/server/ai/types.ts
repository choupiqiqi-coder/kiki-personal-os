export type AiProviderId = "openai" | "gemini" | "anthropic" | "deepseek" | "custom_openai_compatible";
export type AiTaskType = "daily_brief" | "evening_summary" | "viral_material_analysis" | "content_review" | "finance_analysis" | "market_research";
export type TokenUsage = { inputTokens:number|null; outputTokens:number|null; totalTokens:number|null };
export type StructuredRequest = { taskType:AiTaskType; system:string; input:string; schemaName:string; schema:Record<string,unknown>; timeoutMs:number; maxOutputTokens:number; temperature?:number; reasoning?:"low"|"medium"|"high" };
export type StructuredResult = { data:Record<string,unknown>; provider:AiProviderId; model:string; usage:TokenUsage; latencyMs:number };
export type ProviderFailureMetadata = Omit<StructuredResult,"data">;
export class AiProviderFailure extends Error {
  constructor(message:string,readonly metadata:ProviderFailureMetadata){super(message);this.name="AiProviderFailure";}
}
export interface AiProvider { readonly id:AiProviderId; readonly model:string; isConfigured():boolean; generateStructured(request:StructuredRequest):Promise<StructuredResult>; }
export type TaskConfig = { model:string; timeoutMs:number; maxOutputTokens:number; temperature?:number; reasoning?:"low"|"medium"|"high"; maxInputChars:number };
