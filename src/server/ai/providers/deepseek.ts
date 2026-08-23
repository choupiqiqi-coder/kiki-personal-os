import "server-only";
import { buildDeepSeekChatBody,parseDeepSeekChatPayload,type DeepSeekChatPayload } from "@/lib/ai/deepseek-chat";
import { AiProviderFailure,type AiProvider, type StructuredRequest,type StructuredResult } from "../types";

const DEEPSEEK_BASE_URL="https://api.deepseek.com";

export class DeepSeekProvider implements AiProvider{
  readonly id="deepseek" as const;
  readonly model:string;
  private readonly apiKey:string|undefined;

  constructor(model:string,apiKey=process.env.DEEPSEEK_API_KEY){this.model=model;this.apiKey=apiKey;}

  isConfigured(){return Boolean(this.apiKey&&this.model);}

  async generateStructured(request:StructuredRequest):Promise<StructuredResult>{
    if(!this.apiKey)throw new Error("DeepSeek API Key 未配置");
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),request.timeoutMs);
    const started=Date.now();
    try{
      const response=await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`,{
        method:"POST",
        headers:{Authorization:`Bearer ${this.apiKey}`,"Content-Type":"application/json"},
        signal:controller.signal,
        body:JSON.stringify(buildDeepSeekChatBody({model:this.model,system:request.system,prompt:request.input,schema:request.schema,maxOutputTokens:request.maxOutputTokens,temperature:request.temperature})),
      });
      const payload=await readPayload(response);
      if(!response.ok)throw normalizeDeepSeekError(response.status,payload.error);
      let parsed:ReturnType<typeof parseDeepSeekChatPayload>;
      try{parsed=parseDeepSeekChatPayload(payload);}catch(error){
        throw new AiProviderFailure(error instanceof Error?error.message:"DeepSeek 返回内容无法解析",{
          provider:this.id,
          model:payload.model??this.model,
          latencyMs:Date.now()-started,
          usage:{inputTokens:payload.usage?.prompt_tokens??null,outputTokens:payload.usage?.completion_tokens??null,totalTokens:payload.usage?.total_tokens??null},
        });
      }
      return {data:parsed.data,provider:this.id,model:parsed.model??this.model,latencyMs:Date.now()-started,usage:parsed.usage};
    }catch(error){
      if(error instanceof Error&&error.name==="AbortError")throw new Error(`DeepSeek 请求超时（${request.timeoutMs} ms）`);
      throw error;
    }finally{clearTimeout(timer);}
  }
}

async function readPayload(response:Response):Promise<DeepSeekChatPayload>{
  try{return await response.json() as DeepSeekChatPayload;}catch{return{};}
}

function normalizeDeepSeekError(status:number,error:DeepSeekChatPayload["error"]){
  const code=error?.code??error?.type;
  const label=code?` · ${code}`:"";
  return new Error(`DeepSeek 请求失败 (${status}${label})：${error?.message?.slice(0,500)??"未返回错误详情"}`);
}
