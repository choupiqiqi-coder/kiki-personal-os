create table public.memory_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  memory_type text not null
    check (memory_type in ('decision', 'lesson', 'experience', 'preference', 'style_rule', 'principle', 'commitment', 'hypothesis', 'fact')),
  domain text not null default 'global'
    check (domain in ('global', 'media', 'learning', 'health', 'wealth', 'work')),
  title text not null,
  content text not null,
  importance smallint not null default 3 check (importance between 1 and 5),
  status text not null default 'active'
    check (status in ('proposed', 'active', 'superseded', 'expired', 'forgotten')),
  origin text not null default 'user_explicit'
    check (origin in ('user_explicit', 'ai_extracted', 'workflow', 'imported')),
  sensitivity text not null default 'normal'
    check (sensitivity in ('normal', 'personal', 'sensitive', 'highly_sensitive')),
  ai_access text not null default 'allowed'
    check (ai_access in ('never', 'explicit_only', 'allowed')),
  valid_until timestamptz,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.memory_evidence (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  memory_id uuid not null references public.memory_items(id) on delete cascade,
  source_type text not null,
  source_id uuid,
  excerpt text,
  occurred_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.health_water_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount_ml integer not null check (amount_ml > 0 and amount_ml <= 10000),
  logged_at timestamptz not null default now(),
  source text not null default 'manual'
    check (source in ('manual', 'quick_add')),
  created_at timestamptz not null default now()
);

create table public.health_exercise_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_date date not null,
  exercise_type text not null,
  title text not null,
  target_duration_minutes integer check (target_duration_minutes > 0),
  status text not null default 'planned'
    check (status in ('planned', 'completed', 'skipped')),
  exercise_log_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.health_exercise_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  exercise_type text not null,
  started_at timestamptz not null,
  duration_minutes integer not null check (duration_minutes > 0),
  intensity text check (intensity in ('low', 'medium', 'high')),
  calories_burned_kcal numeric check (calories_burned_kcal >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.health_exercise_plans
  add constraint health_exercise_plans_log_fk
  foreign key (exercise_log_id) references public.health_exercise_logs(id) on delete set null;

create table public.health_body_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  measured_at timestamptz not null default now(),
  weight_kg numeric(6,2) not null check (weight_kg > 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index memory_items_user_status_idx
  on public.memory_items (user_id, status, importance desc)
  where deleted_at is null;
create index health_water_user_date_idx
  on public.health_water_logs (user_id, logged_at desc);
create index health_exercise_plans_user_date_idx
  on public.health_exercise_plans (user_id, plan_date desc);
create index health_measurements_user_date_idx
  on public.health_body_measurements (user_id, measured_at desc);

create trigger memory_items_set_updated_at before update on public.memory_items
  for each row execute function public.set_updated_at();
create trigger health_exercise_plans_set_updated_at before update on public.health_exercise_plans
  for each row execute function public.set_updated_at();
create trigger health_exercise_logs_set_updated_at before update on public.health_exercise_logs
  for each row execute function public.set_updated_at();
create trigger health_body_measurements_set_updated_at before update on public.health_body_measurements
  for each row execute function public.set_updated_at();

alter table public.memory_items enable row level security;
alter table public.memory_evidence enable row level security;
alter table public.health_water_logs enable row level security;
alter table public.health_exercise_plans enable row level security;
alter table public.health_exercise_logs enable row level security;
alter table public.health_body_measurements enable row level security;

create policy "memory_items_owner" on public.memory_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "memory_evidence_owner" on public.memory_evidence
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "health_water_logs_owner" on public.health_water_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "health_exercise_plans_owner" on public.health_exercise_plans
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "health_exercise_logs_owner" on public.health_exercise_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "health_body_measurements_owner" on public.health_body_measurements
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select on public.memory_items, public.memory_evidence,
  public.health_water_logs, public.health_exercise_plans,
  public.health_exercise_logs, public.health_body_measurements to anon;

grant select, insert, update, delete on public.memory_items,
  public.memory_evidence, public.health_water_logs,
  public.health_exercise_plans, public.health_exercise_logs,
  public.health_body_measurements to authenticated;
