create table if not exists public.finance_fund_portfolio_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  snapshot_date date not null,
  total_market_value numeric(20,4),
  total_invested numeric(20,4) not null default 0,
  total_profit numeric(20,4),
  total_profit_rate numeric(12,6),
  positions jsonb not null default '[]'::jsonb,
  data_as_of timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, snapshot_date)
);

create index if not exists finance_fund_portfolio_snapshots_user_date_idx
  on public.finance_fund_portfolio_snapshots(user_id, snapshot_date desc);

drop trigger if exists finance_fund_portfolio_snapshots_set_updated_at on public.finance_fund_portfolio_snapshots;
create trigger finance_fund_portfolio_snapshots_set_updated_at
  before update on public.finance_fund_portfolio_snapshots
  for each row execute function public.set_updated_at();

alter table public.finance_fund_portfolio_snapshots enable row level security;

drop policy if exists "finance_fund_portfolio_snapshots_owner" on public.finance_fund_portfolio_snapshots;
create policy "finance_fund_portfolio_snapshots_owner"
  on public.finance_fund_portfolio_snapshots for all
  using(auth.uid() = user_id)
  with check(auth.uid() = user_id);

grant select, insert, update, delete on public.finance_fund_portfolio_snapshots to authenticated;
grant select on public.finance_fund_portfolio_snapshots to anon;

comment on table public.finance_fund_portfolio_snapshots is
  'Deterministic daily snapshots of the lightweight CNY fund portfolio. Current holdings remain authoritative in finance_fund_holdings.';
comment on column public.finance_fund_portfolio_snapshots.positions is
  'Historical facts only; never used as the current holding source and never AI-generated.';
