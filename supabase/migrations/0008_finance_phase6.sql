create table public.finance_accounts (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null, account_type text not null check(account_type in ('fund','brokerage','us_brokerage','cash','other')),
  currency text not null check(currency in ('CNY','USD','HKD')), notes text, include_in_total boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table public.finance_instruments (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null, code text not null, market text not null, instrument_type text not null check(instrument_type in ('fund','etf','stock','index','cash','other')),
  currency text not null check(currency in ('CNY','USD','HKD')), issuer text, primary_industry text, provider_symbol text, notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  unique(user_id,code,market)
);
create table public.finance_tags (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null, tag_type text not null check(tag_type in ('industry','theme')), created_at timestamptz not null default now(),
  unique(user_id,name,tag_type)
);
create table public.finance_instrument_tags (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  instrument_id uuid not null references public.finance_instruments(id) on delete cascade,
  tag_id uuid not null references public.finance_tags(id) on delete cascade, created_at timestamptz not null default now(), unique(instrument_id,tag_id)
);
create table public.finance_transactions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  account_id uuid not null references public.finance_accounts(id) on delete restrict,
  instrument_id uuid not null references public.finance_instruments(id) on delete restrict,
  transaction_type text not null check(transaction_type in ('buy','sell','dividend','dividend_reinvest','transfer_in','transfer_out','fee','adjustment')),
  occurred_at timestamptz not null, shares numeric(20,8), unit_price numeric(20,8), amount numeric(20,4) not null,
  fee numeric(20,4) not null default 0 check(fee>=0), currency text not null check(currency in ('CNY','USD','HKD')), notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table public.finance_positions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  account_id uuid not null references public.finance_accounts(id) on delete cascade,
  instrument_id uuid not null references public.finance_instruments(id) on delete cascade,
  shares numeric(20,8) not null default 0, cost_basis numeric(20,4) not null default 0, average_cost numeric(20,8),
  realized_pnl numeric(20,4) not null default 0, current_price numeric(20,8), market_value numeric(20,4), unrealized_pnl numeric(20,4), return_rate numeric(12,6),
  quote_as_of timestamptz, updated_at timestamptz not null default now(), unique(user_id,account_id,instrument_id)
);
create table public.finance_market_quotes (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  instrument_id uuid not null references public.finance_instruments(id) on delete cascade,
  provider text not null, price numeric(20,8), nav numeric(20,8), change_percent numeric(12,6), data_time timestamptz not null, fetched_at timestamptz not null default now(), raw_meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create table public.finance_market_snapshots (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null, snapshot_type text not null, data_time timestamptz not null, fetched_at timestamptz not null default now(), payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create table public.finance_portfolio_snapshots (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  snapshot_date date not null, currency text not null check(currency in ('CNY','USD','HKD')), total_cost numeric(20,4) not null default 0,
  market_value numeric(20,4), realized_pnl numeric(20,4) not null default 0, unrealized_pnl numeric(20,4), total_return numeric(20,4),
  data_as_of timestamptz, created_at timestamptz not null default now(), unique(user_id,snapshot_date,currency)
);
create table public.finance_analysis_reports (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  report_type text not null default 'portfolio', title text not null, status text not null default 'draft' check(status in ('draft','ready','failed')),
  content jsonb not null default '{}'::jsonb, market_data_as_of timestamptz, ai_artifact_id uuid references public.ai_artifacts(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index finance_accounts_user_idx on public.finance_accounts(user_id,created_at) where deleted_at is null;
create index finance_instruments_user_idx on public.finance_instruments(user_id,code,market) where deleted_at is null;
create index finance_transactions_ledger_idx on public.finance_transactions(user_id,account_id,instrument_id,occurred_at) where deleted_at is null;
create index finance_positions_user_account_idx on public.finance_positions(user_id,account_id,updated_at desc);
create index finance_quotes_instrument_time_idx on public.finance_market_quotes(instrument_id,data_time desc);
create index finance_portfolio_snapshots_user_idx on public.finance_portfolio_snapshots(user_id,currency,snapshot_date desc);
create trigger finance_accounts_set_updated_at before update on public.finance_accounts for each row execute function public.set_updated_at();
create trigger finance_instruments_set_updated_at before update on public.finance_instruments for each row execute function public.set_updated_at();
create trigger finance_transactions_set_updated_at before update on public.finance_transactions for each row execute function public.set_updated_at();
create trigger finance_positions_set_updated_at before update on public.finance_positions for each row execute function public.set_updated_at();
create trigger finance_analysis_reports_set_updated_at before update on public.finance_analysis_reports for each row execute function public.set_updated_at();
alter table public.finance_accounts enable row level security; alter table public.finance_instruments enable row level security;
alter table public.finance_tags enable row level security; alter table public.finance_instrument_tags enable row level security;
alter table public.finance_transactions enable row level security; alter table public.finance_positions enable row level security;
alter table public.finance_market_quotes enable row level security; alter table public.finance_market_snapshots enable row level security;
alter table public.finance_portfolio_snapshots enable row level security; alter table public.finance_analysis_reports enable row level security;
create policy "finance_accounts_owner" on public.finance_accounts for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
create policy "finance_instruments_owner" on public.finance_instruments for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
create policy "finance_tags_owner" on public.finance_tags for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
create policy "finance_instrument_tags_owner" on public.finance_instrument_tags for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
create policy "finance_transactions_owner" on public.finance_transactions for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
create policy "finance_positions_owner" on public.finance_positions for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
create policy "finance_market_quotes_owner" on public.finance_market_quotes for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
create policy "finance_market_snapshots_owner" on public.finance_market_snapshots for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
create policy "finance_portfolio_snapshots_owner" on public.finance_portfolio_snapshots for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
create policy "finance_analysis_reports_owner" on public.finance_analysis_reports for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
grant select on public.finance_accounts,public.finance_instruments,public.finance_tags,public.finance_instrument_tags,public.finance_transactions,public.finance_positions,public.finance_market_quotes,public.finance_market_snapshots,public.finance_portfolio_snapshots,public.finance_analysis_reports to anon;
grant select,insert,update,delete on public.finance_accounts,public.finance_instruments,public.finance_tags,public.finance_instrument_tags,public.finance_transactions,public.finance_positions,public.finance_market_quotes,public.finance_market_snapshots,public.finance_portfolio_snapshots,public.finance_analysis_reports to authenticated;
