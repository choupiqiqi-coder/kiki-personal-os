begin;

alter table public.profiles
  add column if not exists creator_profile jsonb not null default '{}'::jsonb;

update public.profiles
set creator_profile = jsonb_build_object(
  'schemaVersion', '1',
  'accountPositioning', '家居装修 + 设计师视角 + 真实装修决策',
  'targetAudience', jsonb_build_array('正在装修的人', '准备装修的人', '重视设计和品质的人'),
  'tone', jsonb_build_object(
    'traits', jsonb_build_array('真实', '有审美', '有观点', '信息密度高', '不端着', '不像广告'),
    'writingGuidelines', jsonb_build_array('讲清真实过程与取舍', '用普通人能理解的语言表达设计判断')
  ),
  'contentPillars', jsonb_build_array('装修避坑', '材料选择', '施工细节', '家电', '智能家居', '设计观点', '装修决策'),
  'strengths', jsonb_build_array('真实装修过程', '设计师视角', '材料与参数研究', '真实判断和取舍'),
  'preferredFormats', jsonb_build_array('口播', '装修过程记录', '选材对比', '施工细节讲解'),
  'avoidPatterns', jsonb_build_array('纯广告', '无观点产品介绍', '只晒效果', '空洞鸡汤', '直接照搬他人文案')
)
where creator_profile = '{}'::jsonb;

alter table public.media_viral_materials
  add column if not exists author_average_views bigint
    check (author_average_views is null or author_average_views > 0);

create table if not exists public.media_material_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  material_id uuid not null references public.media_viral_materials(id) on delete cascade,
  asset_type text not null default 'screenshot' check (asset_type in ('screenshot')),
  storage_path text not null,
  original_name text,
  mime_type text,
  created_at timestamptz not null default now()
);

create index if not exists media_material_assets_material_idx
  on public.media_material_assets (user_id, material_id, created_at);

alter table public.media_topics
  add column if not exists content_pillar text,
  add column if not exists source_analysis_id uuid references public.media_material_analyses(id) on delete set null,
  add column if not exists selected_adaptation jsonb,
  add column if not exists reusable_patterns jsonb not null default '[]'::jsonb;

alter table public.media_material_assets enable row level security;

create policy "media_material_assets_owner" on public.media_material_assets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select on public.media_material_assets to anon;
grant select, insert, update, delete on public.media_material_assets to authenticated;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('content-material-assets', 'content-material-assets', false, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy "content_material_assets_select_owner" on storage.objects
  for select to authenticated
  using (bucket_id = 'content-material-assets' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "content_material_assets_insert_owner" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'content-material-assets' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "content_material_assets_update_owner" on storage.objects
  for update to authenticated
  using (bucket_id = 'content-material-assets' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'content-material-assets' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "content_material_assets_delete_owner" on storage.objects
  for delete to authenticated
  using (bucket_id = 'content-material-assets' and (storage.foldername(name))[1] = auth.uid()::text);

commit;
