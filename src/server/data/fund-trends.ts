import type { SupabaseClient } from "@supabase/supabase-js";
import { buildFundPortfolioSnapshot } from "@/lib/finance/fund-calculations";
import { throwDataAccessError } from "./database-error";

export type FundSnapshotPosition = {
  holdingId: string;
  fundCode: string;
  fundName: string;
  shares: number | null;
  invested: number;
  nav: number | null;
  navDate: string | null;
  marketValue: number | null;
  profit: number | null;
  profitRate: number | null;
};

export type FundPortfolioSnapshot = {
  id: string;
  snapshot_date: string;
  total_market_value: number | null;
  total_invested: number;
  total_profit: number | null;
  total_profit_rate: number | null;
  positions: FundSnapshotPosition[];
  data_as_of: string | null;
  created_at: string;
  updated_at: string;
};

type HoldingRow = {
  id: string; fund_code: string; fund_name: string; shares: number | null; cost_basis: number;
  latest_nav: number | null; nav_date: string | null; market_value: number | null;
  cumulative_return: number | null; return_rate: number | null; latest_nav_return: number | null;
  quote_fetched_at: string | null;
};

const snapshotFields = "id,snapshot_date,total_market_value,total_invested,total_profit,total_profit_rate,positions,data_as_of,created_at,updated_at";
const holdingFields = "id,fund_code,fund_name,shares,cost_basis,latest_nav,nav_date,market_value,cumulative_return,return_rate,latest_nav_return,quote_fetched_at";

export function shanghaiDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export function createFundTrendsData(client: SupabaseClient) {
  return {
    async list(userId: string, since?: string): Promise<FundPortfolioSnapshot[]> {
      let query = client.from("finance_fund_portfolio_snapshots").select(snapshotFields).eq("user_id", userId).order("snapshot_date", { ascending: true });
      if (since) query = query.gte("snapshot_date", since);
      const { data, error } = await query.returns<FundPortfolioSnapshot[]>();
      if (error) throwDataAccessError("fundTrends.list", error);
      return data ?? [];
    },

    async upsertToday(userId: string, now = new Date()): Promise<FundPortfolioSnapshot> {
      const { data: holdings, error: holdingsError } = await client.from("finance_fund_holdings").select(holdingFields).eq("user_id", userId).is("deleted_at", null).order("created_at", { ascending: true }).returns<HoldingRow[]>();
      if (holdingsError) throwDataAccessError("fundTrends.holdings", holdingsError);
      const rows = holdings ?? [];
      const snapshot = buildFundPortfolioSnapshot(rows);
      const fetchedTimes = rows.map((row) => row.quote_fetched_at).filter((value): value is string => Boolean(value)).sort();
      const row = {
        user_id: userId,
        snapshot_date: shanghaiDate(now),
        total_market_value: snapshot.totalMarketValue,
        total_invested: snapshot.totalInvested,
        total_profit: snapshot.totalProfit,
        total_profit_rate: snapshot.totalProfitRate,
        positions: snapshot.positions,
        data_as_of: fetchedTimes.at(-1) ?? null,
      };
      const { data, error } = await client.from("finance_fund_portfolio_snapshots").upsert(row, { onConflict: "user_id,snapshot_date" }).select(snapshotFields).single<FundPortfolioSnapshot>();
      if (error) throwDataAccessError("fundTrends.upsert", error);
      if (!data) throw new Error("基金组合快照保存失败");
      return data;
    },
  };
}
