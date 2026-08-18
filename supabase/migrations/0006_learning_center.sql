create table public.skill_categories (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null, is_default boolean not null default false, sort_order integer not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  unique (user_id, name)
);
create table public.skill_projects (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  category_id uuid not null references public.skill_categories(id) on delete restrict,
  name text not null, description text, learning_goal text, current_stage text, status text not null default 'want_to_learn' check (status in ('want_to_learn','learning','paused','completed')),
  progress smallint not null default 0 check (progress between 0 and 100), notes text, last_learned_at timestamptz, completed_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table public.skill_learning_logs (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  skill_id uuid not null references public.skill_projects(id) on delete cascade, learned_on date not null default current_date,
  topic text not null, content text, study_notes text, reflection text, problems text, next_step text,
  duration_minutes integer not null default 0 check (duration_minutes between 0 and 1440), plan_completed boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table public.skill_tutorials (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  skill_id uuid references public.skill_projects(id) on delete set null, title text not null, url text, platform text, author text,
  content_type text not null default 'video' check (content_type in ('video','article','course','document','tool','other')),
  tags text[] not null default '{}', notes text, is_learned boolean not null default false,
  saved_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table public.skill_knowledge_notes (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  skill_id uuid not null references public.skill_projects(id) on delete cascade,
  tutorial_id uuid references public.skill_tutorials(id) on delete set null,
  title text not null, body text not null, tags text[] not null default '{}', is_favorite boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create index skill_projects_user_status_idx on public.skill_projects(user_id,status,updated_at desc) where deleted_at is null;
create index skill_logs_user_date_idx on public.skill_learning_logs(user_id,learned_on desc) where deleted_at is null;
create index skill_tutorials_user_saved_idx on public.skill_tutorials(user_id,saved_at desc) where deleted_at is null;
create index skill_notes_user_updated_idx on public.skill_knowledge_notes(user_id,updated_at desc) where deleted_at is null;
create trigger skill_categories_set_updated_at before update on public.skill_categories for each row execute function public.set_updated_at();
create trigger skill_projects_set_updated_at before update on public.skill_projects for each row execute function public.set_updated_at();
create trigger skill_learning_logs_set_updated_at before update on public.skill_learning_logs for each row execute function public.set_updated_at();
create trigger skill_tutorials_set_updated_at before update on public.skill_tutorials for each row execute function public.set_updated_at();
create trigger skill_knowledge_notes_set_updated_at before update on public.skill_knowledge_notes for each row execute function public.set_updated_at();
alter table public.skill_categories enable row level security; alter table public.skill_projects enable row level security;
alter table public.skill_learning_logs enable row level security; alter table public.skill_tutorials enable row level security; alter table public.skill_knowledge_notes enable row level security;
create policy "skill_categories_owner" on public.skill_categories for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "skill_projects_owner" on public.skill_projects for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "skill_learning_logs_owner" on public.skill_learning_logs for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "skill_tutorials_owner" on public.skill_tutorials for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "skill_knowledge_notes_owner" on public.skill_knowledge_notes for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
grant select on public.skill_categories,public.skill_projects,public.skill_learning_logs,public.skill_tutorials,public.skill_knowledge_notes to anon;
grant select,insert,update,delete on public.skill_categories,public.skill_projects,public.skill_learning_logs,public.skill_tutorials,public.skill_knowledge_notes to authenticated;
