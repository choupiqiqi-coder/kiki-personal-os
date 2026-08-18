alter table public.ai_runs
  add column if not exists provider text,
  add column if not exists total_tokens integer,
  add column if not exists error_message text,
  add column if not exists artifact_id uuid references public.ai_artifacts(id) on delete set null;

create index if not exists ai_runs_user_started_idx
  on public.ai_runs (user_id, started_at desc);
