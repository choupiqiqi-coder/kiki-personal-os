"use client";

import { useState } from "react";
import { parseContentSourceInput } from "@/lib/content/source-input";
import type { Material } from "@/server/data/content-studio";
import { Field,FormActions,inputClass,textareaClass } from "./field";
export function MaterialForm({action,item}:{action:(form:FormData)=>Promise<void>;item?:Material}){
  const [platform,setPlatform]=useState(item?.platform??"");
  const [sourceUrl,setSourceUrl]=useState(item?.source_url??"");
  const parseAndApply=(value:string)=>{
    const parsed=parseContentSourceInput(value);
    if(!parsed.sourceUrl)return false;
    setSourceUrl(parsed.sourceUrl);
    if(parsed.platform&&!platform.trim())setPlatform(parsed.platform);
    return true;
  };
  return <form action={action} className="space-y-5"><Field label="素材标题"><input name="title" required defaultValue={item?.title} className={inputClass} autoFocus /></Field><div className="grid grid-cols-2 gap-3"><Field label="平台"><input name="platform" required value={platform} onChange={(event)=>setPlatform(event.target.value)} className={inputClass} placeholder="抖音 / 小红书" /></Field><Field label="类型"><select name="contentType" defaultValue={item?.content_type??"video"} className={inputClass}><option value="video">视频</option><option value="image">图文</option><option value="article">文章</option><option value="post">帖子</option><option value="other">其他</option></select></Field></div><Field label="正文 / 口播（建议填写）"><textarea name="contentSnapshot" rows={8} defaultValue={item?.content_snapshot??""} className={textareaClass} placeholder="粘贴原内容中可供分析的正文或口播。系统只提炼机制，不复制原文。"/></Field><Field label="原内容链接"><input name="sourceUrl" type="text" inputMode="url" value={sourceUrl} onChange={(event)=>setSourceUrl(event.target.value)} onPaste={(event)=>{const pasted=event.clipboardData.getData("text");if(parseAndApply(pasted))event.preventDefault();}} onBlur={(event)=>parseAndApply(event.currentTarget.value)} className={inputClass} placeholder="可直接粘贴抖音 / 小红书分享文本或链接" /><p className="mt-2 text-xs text-muted-foreground">支持直接粘贴 App 复制的整段分享内容，系统会自动提取链接。</p></Field><Field label="作者 / 账号（可选）"><input name="authorName" defaultValue={item?.author_name??""} className={inputClass} /></Field><div className="grid grid-cols-2 gap-3">{[["views","当前播放量"],["authorAverageViews","作者近期平均播放量"],["likes","点赞"],["comments","评论"],["saves","收藏"],["shares","分享"]].map(([name,label])=><Field key={name} label={label}><input name={name} type="number" min={name==="authorAverageViews"?1:0} defaultValue={name==="authorAverageViews"?(item?.author_average_views??""):(item?.[name as keyof Material] as number??"")} className={inputClass}/></Field>)}</div><Field label="参考截图（可选，最多 10MB/张）"><input name="screenshots" type="file" multiple accept="image/jpeg,image/png,image/webp" className={inputClass}/><p className="mt-2 text-xs text-muted-foreground">截图会私有保存作为来源参考。当前文本模型不会假装识别截图内容，请同时粘贴需要分析的文字。</p></Field><Field label="标签（逗号分隔）"><input name="tags" defaultValue={item?.tags.join("，")??""} className={inputClass}/></Field><Field label="我的备注"><textarea name="notes" rows={4} defaultValue={item?.notes??""} className={textareaClass}/></Field><FormActions label={item?"保存修改":"保存素材"}/></form>}
