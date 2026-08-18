create table public.finance_fund_holdings (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  fund_code text not null check(fund_code ~ '^[0-9]{6}$'), fund_name text not null, fund_type text, benchmark text,
  shares numeric(20,8) check(shares is null or shares >= 0), manual_holding_amount numeric(20,4) check(manual_holding_amount is null or manual_holding_amount >= 0),
  cost_basis numeric(20,4) not null check(cost_basis >= 0), latest_nav numeric(20,8), nav_date date, daily_change_percent numeric(12,6),
  market_value numeric(20,4), cumulative_return numeric(20,4), return_rate numeric(12,6),
  quote_provider text, quote_source text, quote_fetched_at timestamptz, association_status text not null default 'unknown' check(association_status in ('confirmed','unknown')),
  notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table public.finance_fund_nav_history (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  holding_id uuid not null references public.finance_fund_holdings(id) on delete cascade, fund_code text not null,
  nav_date date not null, unit_nav numeric(20,8) not null, daily_change_percent numeric(12,6), provider text not null, source text not null,
  fetched_at timestamptz not null, created_at timestamptz not null default now(), unique(user_id,fund_code,nav_date)
);
create unique index finance_fund_holdings_user_code_idx on public.finance_fund_holdings(user_id,fund_code) where deleted_at is null;
create index finance_fund_nav_history_lookup_idx on public.finance_fund_nav_history(user_id,holding_id,nav_date desc);
create trigger finance_fund_holdings_set_updated_at before update on public.finance_fund_holdings for each row execute function public.set_updated_at();
alter table public.finance_fund_holdings enable row level security;
alter table public.finance_fund_nav_history enable row level security;
create policy "finance_fund_holdings_owner" on public.finance_fund_holdings for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
create policy "finance_fund_nav_history_owner" on public.finance_fund_nav_history for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
grant select,insert,update,delete on public.finance_fund_holdings,public.finance_fund_nav_history to authenticated;
grant select on public.finance_fund_holdings,public.finance_fund_nav_history to anon;
