import type { ReactNode } from "react";
export const inputClass="min-h-13 w-full rounded-2xl border border-border bg-surface px-4 outline-none focus:border-primary focus:ring-3 focus:ring-primary/10";
export const textareaClass="w-full resize-none rounded-2xl border border-border bg-surface px-4 py-3 outline-none focus:border-primary focus:ring-3 focus:ring-primary/10";
export function Field({label,children}:{label:string;children:ReactNode}){return <label className="block"><span className="mb-2 block text-sm font-medium">{label}</span>{children}</label>}
export function FormActions({label}:{label:string}){return <button className="min-h-13 w-full rounded-2xl bg-primary px-5 font-semibold text-white active:scale-[.99]">{label}</button>}
