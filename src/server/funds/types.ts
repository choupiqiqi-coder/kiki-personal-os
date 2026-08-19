import type { FundNavData } from "@/server/market/types";

export interface FundNavProvider {
  readonly id: string;
  getFormalNav(fundCode: string): Promise<FundNavData>;
}

export function validateFundCode(value: string): string {
  const code = value.trim();
  if (!/^\d{6}$/.test(code)) throw new Error("基金代码必须是 6 位数字");
  return code;
}
