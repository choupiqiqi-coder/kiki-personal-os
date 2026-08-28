import type { CreatorProfile } from "@/lib/content/creator-profile";
import { Field, FormActions, textareaClass } from "./field";

const lines = (items: string[]) => items.join("\n");

export function CreatorProfileForm({ action, profile }: { action: (form: FormData) => Promise<void>; profile: CreatorProfile }) {
  return <form action={action} className="space-y-5">
    <Field label="账号定位"><textarea name="accountPositioning" rows={2} required defaultValue={profile.accountPositioning} className={textareaClass}/></Field>
    <Field label="目标受众（每行一项）"><textarea name="targetAudience" rows={4} required defaultValue={lines(profile.targetAudience)} className={textareaClass}/></Field>
    <Field label="内容气质（每行一项）"><textarea name="toneTraits" rows={4} required defaultValue={lines(profile.tone.traits)} className={textareaClass}/></Field>
    <Field label="表达原则（每行一项）"><textarea name="writingGuidelines" rows={3} defaultValue={lines(profile.tone.writingGuidelines)} className={textareaClass}/></Field>
    <Field label="内容支柱（每行一项）"><textarea name="contentPillars" rows={7} required defaultValue={lines(profile.contentPillars)} className={textareaClass}/></Field>
    <Field label="我的优势（每行一项）"><textarea name="strengths" rows={4} defaultValue={lines(profile.strengths)} className={textareaClass}/></Field>
    <Field label="偏好形式（每行一项）"><textarea name="preferredFormats" rows={4} defaultValue={lines(profile.preferredFormats)} className={textareaClass}/></Field>
    <Field label="明确避免（每行一项）"><textarea name="avoidPatterns" rows={5} required defaultValue={lines(profile.avoidPatterns)} className={textareaClass}/></Field>
    <p className="rounded-2xl bg-surface-muted p-4 text-sm text-muted-foreground">这份定位会统一进入爆款拆解和后续内容 AI，不会让模型只凭一个标题自由发挥。</p>
    <FormActions label="保存 Creator Profile"/>
  </form>;
}
