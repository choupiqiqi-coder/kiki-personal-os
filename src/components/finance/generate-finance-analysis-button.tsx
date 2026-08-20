"use client";
import { useFormStatus } from "react-dom";
export function GenerateFinanceAnalysisButton({disabled,hasArtifact}:{disabled:boolean;hasArtifact:boolean}){const{pending}=useFormStatus();return <button disabled={disabled||pending} className="min-h-13 w-full rounded-2xl bg-primary px-4 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">{pending?"正在整理真实数据并生成…":hasArtifact?"根据最新事实生成分析":"生成今日分析"}</button>}
