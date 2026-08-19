alter table public.finance_fund_holdings
  add column if not exists accumulated_nav numeric(20,8),
  add column if not exists latest_nav_return numeric(20,4),
  add column if not exists tags text[] not null default '{}';

alter table public.finance_fund_nav_history
  add column if not exists accumulated_nav numeric(20,8);

create index if not exists finance_fund_holdings_active_user_idx
  on public.finance_fund_holdings(user_id, created_at desc)
  where deleted_at is null;

comment on column public.finance_fund_holdings.latest_nav is 'Latest formally published unit NAV; never intraday estimate.';
comment on column public.finance_fund_holdings.latest_nav_return is 'Deterministic holding return between the latest two formally published NAV dates.';
comment on column public.finance_fund_holdings.quote_fetched_at is 'UTC timestamp when the formal NAV was fetched or manually recorded.';
