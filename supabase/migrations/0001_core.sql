create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  timezone text not null default 'Asia/Shanghai',
  locale text not null default 'zh-CN',
  morning_start_time time not null default '07:00',
  evening_start_time time not null default '21:00',
  content_positioning text,
  target_audience text,
  ai_response_style text not null default 'concise'
    check (ai_response_style in ('concise', 'balanced', 'detailed')),
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profile_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  domain text not null check (domain in ('life', 'media', 'learning', 'health', 'wealth', 'work')),
  title text not null,
  description text,
  priority smallint not null default 3 check (priority between 1 and 5),
  target_date date,
  status text not null default 'active'
    check (status in ('draft', 'active', 'paused', 'achieved', 'abandoned')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  notes text,
  status text not null default 'todo'
    check (status in ('todo', 'doing', 'done', 'cancelled')),
  priority text not null default 'medium'
    check (priority in ('low', 'medium', 'high')),
  scheduled_date date,
  scheduled_time time,
  due_at timestamptz,
  source_type text not null default 'manual',
  source_id uuid,
  sort_order integer not null default 0,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index tasks_user_schedule_idx
  on public.tasks (user_id, scheduled_date, sort_order)
  where deleted_at is null;

create table public.daily_pages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  page_date date not null,
  workflow_state text not null default 'not_started'
    check (workflow_state in ('not_started', 'morning_planning', 'active_day', 'evening_review', 'completed')),
  intention text,
  energy_level_morning smallint check (energy_level_morning between 1 and 5),
  mood_morning smallint check (mood_morning between 1 and 5),
  morning_completed_at timestamptz,
  morning_skipped_at timestamptz,
  evening_completed_at timestamptz,
  evening_skipped_at timestamptz,
  last_activity_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, page_date)
);

create table public.daily_focus_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  daily_page_id uuid not null references public.daily_pages(id) on delete cascade,
  title text not null,
  item_type text not null
    check (item_type in ('task', 'fitness', 'media', 'learning', 'custom')),
  source_id uuid,
  origin text not null default 'user'
    check (origin in ('user', 'ai_suggested')),
  status text not null default 'planned'
    check (status in ('planned', 'done', 'skipped')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index daily_focus_page_idx
  on public.daily_focus_items (daily_page_id, sort_order);

create table public.daily_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  daily_page_id uuid not null unique references public.daily_pages(id) on delete cascade,
  wins text,
  challenges text,
  learnings text,
  tomorrow_note text,
  energy_level_evening smallint check (energy_level_evening between 1 and 5),
  mood_evening smallint check (mood_evening between 1 and 5),
  ai_artifact_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ai_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  agent_type text not null,
  trigger_type text not null default 'user'
    check (trigger_type in ('user', 'schedule', 'app_open', 'event')),
  status text not null default 'queued'
    check (status in ('queued', 'running', 'ready', 'failed', 'cancelled')),
  input_refs jsonb not null default '{}'::jsonb,
  deduplication_key text,
  attempt_count integer not null default 0,
  scheduled_for timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, deduplication_key)
);

create table public.ai_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  job_id uuid references public.ai_jobs(id) on delete set null,
  agent_type text not null,
  model text not null,
  prompt_version text not null,
  output_schema_version text not null default '1',
  input_hash text,
  status text not null default 'running'
    check (status in ('running', 'ready', 'failed')),
  input_tokens integer,
  output_tokens integer,
  latency_ms integer,
  error_code text,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create table public.ai_artifacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  run_id uuid references public.ai_runs(id) on delete set null,
  artifact_type text not null,
  title text not null,
  summary text,
  content jsonb not null default '{}'::jsonb,
  version integer not null default 1,
  data_as_of timestamptz,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.daily_reviews
  add constraint daily_reviews_ai_artifact_fk
  foreign key (ai_artifact_id) references public.ai_artifacts(id) on delete set null;

create table public.ai_artifact_sources (
  id uuid primary key default gen_random_uuid(),
  artifact_id uuid not null references public.ai_artifacts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  source_title text not null,
  source_url text,
  source_type text not null default 'web',
  published_at timestamptz,
  data_as_of timestamptz,
  citation_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index ai_artifacts_user_type_idx
  on public.ai_artifacts (user_id, artifact_type, generated_at desc);

create table public.approval_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  ai_artifact_id uuid references public.ai_artifacts(id) on delete set null,
  action_type text not null
    check (action_type in ('create_task', 'create_topic', 'save_memory', 'reschedule')),
  proposal jsonb not null,
  reason text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'expired', 'executed')),
  expires_at timestamptz,
  reviewed_at timestamptz,
  executed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger profile_goals_set_updated_at before update on public.profile_goals
  for each row execute function public.set_updated_at();
create trigger tasks_set_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();
create trigger daily_pages_set_updated_at before update on public.daily_pages
  for each row execute function public.set_updated_at();
create trigger daily_focus_items_set_updated_at before update on public.daily_focus_items
  for each row execute function public.set_updated_at();
create trigger daily_reviews_set_updated_at before update on public.daily_reviews
  for each row execute function public.set_updated_at();
create trigger ai_jobs_set_updated_at before update on public.ai_jobs
  for each row execute function public.set_updated_at();
create trigger approval_requests_set_updated_at before update on public.approval_requests
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.profile_goals enable row level security;
alter table public.tasks enable row level security;
alter table public.daily_pages enable row level security;
alter table public.daily_focus_items enable row level security;
alter table public.daily_reviews enable row level security;
alter table public.ai_jobs enable row level security;
alter table public.ai_runs enable row level security;
alter table public.ai_artifacts enable row level security;
alter table public.ai_artifact_sources enable row level security;
alter table public.approval_requests enable row level security;

create policy "profiles_owner" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "profile_goals_owner" on public.profile_goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "tasks_owner" on public.tasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "daily_pages_owner" on public.daily_pages
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "daily_focus_items_owner" on public.daily_focus_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "daily_reviews_owner" on public.daily_reviews
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "ai_jobs_owner" on public.ai_jobs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "ai_runs_owner" on public.ai_runs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "ai_artifacts_owner" on public.ai_artifacts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "ai_artifact_sources_owner" on public.ai_artifact_sources
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "approval_requests_owner" on public.approval_requests
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select on public.profiles, public.profile_goals, public.tasks,
  public.daily_pages, public.daily_focus_items, public.daily_reviews,
  public.ai_jobs, public.ai_runs, public.ai_artifacts,
  public.ai_artifact_sources, public.approval_requests to anon;

grant select, insert, update, delete on public.profiles, public.profile_goals,
  public.tasks, public.daily_pages, public.daily_focus_items,
  public.daily_reviews, public.ai_jobs, public.ai_runs, public.ai_artifacts,
  public.ai_artifact_sources, public.approval_requests to authenticated;
