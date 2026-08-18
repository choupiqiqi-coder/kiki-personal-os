alter table public.media_viral_materials
  add column if not exists views bigint,
  add column if not exists likes bigint,
  add column if not exists comments bigint,
  add column if not exists saves bigint,
  add column if not exists shares bigint,
  add column if not exists tags text[] not null default '{}',
  add column if not exists is_favorite boolean not null default false;

alter table public.media_topics
  add column if not exists content_direction text,
  add column if not exists core_viewpoint text,
  add column if not exists opening_hook text,
  add column if not exists content_structure text,
  add column if not exists copy_materials text,
  add column if not exists shooting_ideas text,
  add column if not exists reference_url text,
  add column if not exists tags text[] not null default '{}',
  add column if not exists notes text,
  add column if not exists is_favorite boolean not null default false;

alter table public.media_topics drop constraint if exists media_topics_status_check;
alter table public.media_topics add constraint media_topics_status_check
  check (status in ('idea', 'planned', 'scripting', 'producing', 'published', 'reviewed', 'archived'));

alter table public.media_topic_sources drop constraint if exists media_topic_sources_source_type_check;
alter table public.media_topic_sources add constraint media_topic_sources_source_type_check
  check (source_type in ('inspiration', 'viral_material', 'manual', 'ai_recommendation'));

alter table public.media_publications
  add column if not exists traffic_sources text,
  add column if not exists notes text;

create index if not exists media_materials_favorite_idx
  on public.media_viral_materials (user_id, is_favorite, created_at desc)
  where deleted_at is null;

create index if not exists media_topics_favorite_idx
  on public.media_topics (user_id, is_favorite, updated_at desc)
  where deleted_at is null;
