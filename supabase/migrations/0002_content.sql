create table public.media_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  platform text not null,
  account_name text not null,
  account_handle text,
  profile_url text,
  positioning_statement text,
  status text not null default 'active'
    check (status in ('active', 'paused', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.media_inspirations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  content text,
  source_url text,
  source_platform text,
  inspiration_date date not null default current_date,
  status text not null default 'inbox'
    check (status in ('inbox', 'selected', 'converted', 'archived')),
  is_completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.media_viral_materials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  platform text not null,
  content_type text not null default 'video'
    check (content_type in ('video', 'image', 'article', 'post', 'other')),
  title text not null,
  source_url text,
  author_name text,
  published_at timestamptz,
  content_snapshot text,
  notes text,
  status text not null default 'inbox'
    check (status in ('inbox', 'analyzed', 'used', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.media_material_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  material_id uuid not null references public.media_viral_materials(id) on delete cascade,
  analysis_type text not null
    check (analysis_type in ('hotspot', 'video_breakdown', 'recreation_plan')),
  version integer not null default 1,
  result jsonb not null default '{}'::jsonb,
  ai_artifact_id uuid references public.ai_artifacts(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (material_id, analysis_type, version)
);

create table public.media_topics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  angle text,
  audience text,
  content_format text,
  status text not null default 'idea'
    check (status in ('idea', 'planned', 'scripting', 'producing', 'published', 'archived')),
  priority text not null default 'medium'
    check (priority in ('low', 'medium', 'high')),
  scheduled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.media_topic_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  topic_id uuid not null references public.media_topics(id) on delete cascade,
  source_type text not null check (source_type in ('inspiration', 'viral_material', 'manual')),
  source_id uuid,
  relationship text not null default 'reference'
    check (relationship in ('origin', 'reference', 'evidence')),
  created_at timestamptz not null default now()
);

create table public.media_publications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  account_id uuid not null references public.media_accounts(id) on delete cascade,
  topic_id uuid references public.media_topics(id) on delete set null,
  platform text not null,
  title text not null,
  content_url text,
  content_snapshot text,
  published_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.media_publication_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  publication_id uuid not null references public.media_publications(id) on delete cascade,
  recorded_at timestamptz not null default now(),
  views bigint,
  likes bigint,
  comments bigint,
  shares bigint,
  saves bigint,
  followers_gained bigint,
  avg_watch_seconds numeric,
  completion_rate numeric check (completion_rate between 0 and 1),
  extra_metrics jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.media_content_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  publication_id uuid not null references public.media_publications(id) on delete cascade,
  metric_snapshot_id uuid references public.media_publication_metrics(id) on delete set null,
  manual_summary text,
  problems text,
  next_actions text,
  ai_artifact_id uuid references public.ai_artifacts(id) on delete set null,
  reviewed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index media_inspirations_user_date_idx
  on public.media_inspirations (user_id, inspiration_date desc)
  where deleted_at is null;
create index media_materials_user_created_idx
  on public.media_viral_materials (user_id, created_at desc)
  where deleted_at is null;
create index media_topics_user_status_idx
  on public.media_topics (user_id, status, updated_at desc)
  where deleted_at is null;
create index media_publications_account_date_idx
  on public.media_publications (account_id, published_at desc)
  where deleted_at is null;

create trigger media_accounts_set_updated_at before update on public.media_accounts
  for each row execute function public.set_updated_at();
create trigger media_inspirations_set_updated_at before update on public.media_inspirations
  for each row execute function public.set_updated_at();
create trigger media_viral_materials_set_updated_at before update on public.media_viral_materials
  for each row execute function public.set_updated_at();
create trigger media_topics_set_updated_at before update on public.media_topics
  for each row execute function public.set_updated_at();
create trigger media_publications_set_updated_at before update on public.media_publications
  for each row execute function public.set_updated_at();
create trigger media_content_reviews_set_updated_at before update on public.media_content_reviews
  for each row execute function public.set_updated_at();

alter table public.media_accounts enable row level security;
alter table public.media_inspirations enable row level security;
alter table public.media_viral_materials enable row level security;
alter table public.media_material_analyses enable row level security;
alter table public.media_topics enable row level security;
alter table public.media_topic_sources enable row level security;
alter table public.media_publications enable row level security;
alter table public.media_publication_metrics enable row level security;
alter table public.media_content_reviews enable row level security;

create policy "media_accounts_owner" on public.media_accounts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "media_inspirations_owner" on public.media_inspirations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "media_viral_materials_owner" on public.media_viral_materials
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "media_material_analyses_owner" on public.media_material_analyses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "media_topics_owner" on public.media_topics
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "media_topic_sources_owner" on public.media_topic_sources
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "media_publications_owner" on public.media_publications
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "media_publication_metrics_owner" on public.media_publication_metrics
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "media_content_reviews_owner" on public.media_content_reviews
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select on public.media_accounts, public.media_inspirations,
  public.media_viral_materials, public.media_material_analyses,
  public.media_topics, public.media_topic_sources, public.media_publications,
  public.media_publication_metrics, public.media_content_reviews to anon;

grant select, insert, update, delete on public.media_accounts,
  public.media_inspirations, public.media_viral_materials,
  public.media_material_analyses, public.media_topics,
  public.media_topic_sources, public.media_publications,
  public.media_publication_metrics, public.media_content_reviews to authenticated;
