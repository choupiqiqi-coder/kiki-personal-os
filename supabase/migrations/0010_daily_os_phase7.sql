create table public.daily_page_artifacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  daily_page_id uuid not null references public.daily_pages(id) on delete cascade,
  ai_artifact_id uuid not null references public.ai_artifacts(id) on delete cascade,
  artifact_role text not null check (artifact_role in ('morning_brief','evening_summary','action_suggestion')),
  created_at timestamptz not null default now(),
  unique(daily_page_id,ai_artifact_id,artifact_role)
);
alter table public.daily_focus_items add column completed_at timestamptz;
alter table public.daily_focus_items add column source_snapshot jsonb not null default '{}'::jsonb;
create index daily_pages_user_state_date_idx on public.daily_pages(user_id,workflow_state,page_date desc);
create index daily_page_artifacts_page_role_idx on public.daily_page_artifacts(daily_page_id,artifact_role,created_at desc);
alter table public.daily_page_artifacts enable row level security;
create policy "daily_page_artifacts_owner" on public.daily_page_artifacts for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
grant select on public.daily_page_artifacts to anon;
grant select,insert,update,delete on public.daily_page_artifacts to authenticated;
