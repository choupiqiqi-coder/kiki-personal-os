import "server-only";
import { buildOpenAIResponsesBody,parseOpenAIResponsesPayload,type OpenAiResponsesPayload } from "@/lib/ai/openai-responses";
import type { AiProvider,StructuredRequest,StructuredResult } from "../types";

export class OpenAIProvider implements AiProvider{
  readonly id="openai" as const;
  readonly model:string;private readonly apiKey:string|undefined;
  constructor(model:string,apiKey=process.env.OPENAI_API_KEY){this.model=model;this.apiKey=apiKey;}
  isConfigured(){return Boolean(this.apiKey&&this.model);}
  async generateStructured(request:StructuredRequest):Promise<StructuredResult>{
    if(!this.apiKey)throw new Error("OpenAI API Key 未配置");
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),request.timeoutMs);const started=Date.now();
    try{
      const response=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{Authorization:`Bearer ${this.apiKey}`,"Content-Type":"application/json"},signal:controller.signal,body:JSON.stringify(buildOpenAIResponsesBody({model:this.model,system:request.system,prompt:request.input,schemaName:request.schemaName,schema:request.schema,maxOutputTokens:request.maxOutputTokens,reasoning:request.reasoning}))});
      const payload=await readPayload(response);
      if(!response.ok)throw normalizeOpenAIError(response.status,payload.error);
      const parsed=parseOpenAIResponsesPayload(payload);
      return{data:parsed.data,provider:this.id,model:parsed.model??this.model,latencyMs:Date.now()-started,usage:parsed.usage};
    }catch(error){if(error instanceof Error&&error.name==="AbortError")throw new Error(`OpenAI 请求超时（${request.timeoutMs} ms）`);throw error;}finally{clearTimeout(timer);}
  }
}

async function readPayload(response:Response):Promise<OpenAiResponsesPayload>{try{return await response.json() as OpenAiResponsesPayload;}catch{return{};}}
function normalizeOpenAIError(status:number,error:OpenAiResponsesPayload["error"]){const code=error?.code??error?.type;const label=code?` · ${code}`:"";return new Error(`OpenAI 请求失败 (${status}${label})：${error?.message?.slice(0,500)??"未返回错误详情"}`);}
