export type DeepSeekChatPayload={
  model?:string;
  choices?:Array<{finish_reason?:string|null;message?:{content?:string|null}}>;
  usage?:{prompt_tokens?:number;completion_tokens?:number;total_tokens?:number};
  error?:{message?:string;type?:string;code?:string};
};

type BodyInput={model:string;system:string;prompt:string;schema:Record<string,unknown>;maxOutputTokens:number;temperature?:number};

export function buildDeepSeekChatBody(input:BodyInput){
  return {
    model:input.model,
    messages:[
      {role:"system",content:`${input.system}\n必须只返回 JSON，且必须完整符合以下 JSON Schema；不要使用 Markdown，不要增加 Schema 之外的字段：${JSON.stringify(input.schema)}`},
      {role:"user",content:input.prompt},
    ],
    response_format:{type:"json_object"},
    thinking:{type:"disabled"},
    stream:false,
    max_tokens:input.maxOutputTokens,
    temperature:input.temperature,
  };
}

export function parseDeepSeekChatPayload(payload:DeepSeekChatPayload){
  const choice=payload.choices?.[0];
  if(choice?.finish_reason&&choice.finish_reason!=="stop")throw new Error(`DeepSeek 输出未完整结束（${choice.finish_reason}）`);
  const output=choice?.message?.content?.trim();
  if(!output)throw new Error("DeepSeek 未返回可解析的 JSON 内容");
  let data:Record<string,unknown>;
  try{data=JSON.parse(output) as Record<string,unknown>;}catch{throw new Error("DeepSeek 返回内容不是有效 JSON");}
  return {
    data,
    model:payload.model,
    usage:{
      inputTokens:payload.usage?.prompt_tokens??null,
      outputTokens:payload.usage?.completion_tokens??null,
      totalTokens:payload.usage?.total_tokens??null,
    },
  };
}
