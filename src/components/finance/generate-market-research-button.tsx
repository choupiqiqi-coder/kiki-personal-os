"use client";
import { useFormStatus } from "react-dom";
export function GenerateMarketResearchButton({disabled,hasArtifact,stale}:{disabled:boolean;hasArtifact:boolean;stale:boolean}){const{pending}=useFormStatus();return <button disabled={disabled||pending} className="min-h-13 w-full rounded-2xl bg-primary px-4 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">{pending?"正在核验事实并生成市场解读…":stale?"市场数据已更新，更新解读":hasArtifact?"根据当前事实重新生成":"生成今日市场解读"}</button>}
