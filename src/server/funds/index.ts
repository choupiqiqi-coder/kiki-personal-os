import "server-only";
import type { FundNavProvider } from "./types";
import { EastmoneyFundNavProvider } from "./providers/eastmoney";
import { TencentFundNavProvider } from "./providers/tencent";

export function getFundNavProvider(): FundNavProvider {
  return new CompositeFundNavProvider(new EastmoneyFundNavProvider(), new TencentFundNavProvider());
}

export class CompositeFundNavProvider implements FundNavProvider {
  readonly id = "eastmoney_fund+tencent_fund";
  constructor(private readonly primary: FundNavProvider, private readonly fallback: FundNavProvider) {}
  async getFormalNav(code: string) {
    try { return await this.primary.getFormalNav(code); }
    catch (primaryError) {
      try { return await this.fallback.getFormalNav(code); }
      catch (fallbackError) { throw new AggregateError([primaryError, fallbackError], "基金正式净值 Primary 与 Fallback 均失败"); }
    }
  }
}
