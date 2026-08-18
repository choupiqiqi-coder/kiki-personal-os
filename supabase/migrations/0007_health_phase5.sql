alter table public.health_body_measurements
  add column if not exists height_cm numeric(5,2) check (height_cm > 0),
  add column if not exists chest_cm numeric(5,2) check (chest_cm > 0),
  add column if not exists waist_cm numeric(5,2) check (waist_cm > 0),
  add column if not exists hip_cm numeric(5,2) check (hip_cm > 0),
  add column if not exists thigh_cm numeric(5,2) check (thigh_cm > 0),
  add column if not exists arm_cm numeric(5,2) check (arm_cm > 0),
  add column if not exists body_fat_percent numeric(5,2) check (body_fat_percent between 0 and 100),
  add column if not exists deleted_at timestamptz;

alter table public.health_water_logs add column if not exists updated_at timestamptz not null default now();
create trigger health_water_logs_set_updated_at before update on public.health_water_logs for each row execute function public.set_updated_at();

alter table public.health_exercise_logs
  add column if not exists exercise_name text,
  add column if not exists met_value numeric(4,2) check (met_value > 0),
  add column if not exists calorie_source text not null default 'manual' check (calorie_source in ('manual','met_estimate')),
  add column if not exists deleted_at timestamptz;

create table public.health_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  water_goal_ml integer not null default 2000 check (water_goal_ml between 100 and 10000),
  height_cm numeric(5,2) check (height_cm > 0), weight_kg numeric(6,2) check (weight_kg > 0),
  birth_year integer check (birth_year between 1900 and 2200), sex text check (sex in ('female','male','unspecified')),
  activity_level text not null default 'sedentary' check (activity_level in ('sedentary','light','moderate','active','very_active')),
  health_goal text not null default 'maintain' check (health_goal in ('maintain','fat_loss','gain')),
  daily_calorie_target integer check (daily_calorie_target between 500 and 10000),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.health_periods (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  start_date date not null, end_date date check (end_date is null or end_date >= start_date),
  flow_level text check (flow_level in ('light','medium','heavy')), symptoms text[] not null default '{}', notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);

create table public.health_food_library (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null, default_unit text not null default 'g', calories_per_100g numeric(8,2) not null check (calories_per_100g >= 0),
  protein_per_100g numeric(8,2) check (protein_per_100g >= 0), carbs_per_100g numeric(8,2) check (carbs_per_100g >= 0), fat_per_100g numeric(8,2) check (fat_per_100g >= 0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  unique(user_id,name)
);

create table public.health_meals (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  meal_date date not null, meal_type text not null check (meal_type in ('breakfast','lunch','dinner','snack','other')),
  notes text, is_planned boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);

create table public.health_meal_items (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  meal_id uuid not null references public.health_meals(id) on delete cascade, food_id uuid references public.health_food_library(id) on delete set null,
  food_name text not null, amount numeric(8,2) not null check (amount > 0), unit text not null default 'g',
  calories_kcal numeric(9,2) not null check (calories_kcal >= 0), protein_g numeric(9,2) check (protein_g >= 0), carbs_g numeric(9,2) check (carbs_g >= 0), fat_g numeric(9,2) check (fat_g >= 0), notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.health_body_photos (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  measurement_id uuid not null references public.health_body_measurements(id) on delete cascade,
  view_type text not null check (view_type in ('front','side','back')), storage_path text not null,
  created_at timestamptz not null default now(), unique(measurement_id,view_type)
);

create table public.health_daily_summaries (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  summary_date date not null, intake_kcal numeric(10,2) not null default 0, protein_g numeric(10,2) not null default 0,
  carbs_g numeric(10,2) not null default 0, fat_g numeric(10,2) not null default 0, exercise_kcal numeric(10,2) not null default 0,
  bmr_kcal numeric(10,2), estimated_total_burn_kcal numeric(10,2), calorie_balance_kcal numeric(10,2),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(user_id,summary_date)
);

create index health_periods_user_start_idx on public.health_periods(user_id,start_date desc) where deleted_at is null;
create index health_food_user_name_idx on public.health_food_library(user_id,name) where deleted_at is null;
create index health_meals_user_date_idx on public.health_meals(user_id,meal_date) where deleted_at is null;
create index health_meal_items_meal_idx on public.health_meal_items(meal_id);
create index health_photos_measurement_idx on public.health_body_photos(measurement_id);
create index health_summaries_user_date_idx on public.health_daily_summaries(user_id,summary_date desc);

create trigger health_settings_set_updated_at before update on public.health_settings for each row execute function public.set_updated_at();
create trigger health_periods_set_updated_at before update on public.health_periods for each row execute function public.set_updated_at();
create trigger health_food_library_set_updated_at before update on public.health_food_library for each row execute function public.set_updated_at();
create trigger health_meals_set_updated_at before update on public.health_meals for each row execute function public.set_updated_at();
create trigger health_meal_items_set_updated_at before update on public.health_meal_items for each row execute function public.set_updated_at();
create trigger health_daily_summaries_set_updated_at before update on public.health_daily_summaries for each row execute function public.set_updated_at();

alter table public.health_settings enable row level security; alter table public.health_periods enable row level security;
alter table public.health_food_library enable row level security; alter table public.health_meals enable row level security;
alter table public.health_meal_items enable row level security; alter table public.health_body_photos enable row level security;
alter table public.health_daily_summaries enable row level security;
create policy "health_settings_owner" on public.health_settings for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
create policy "health_periods_owner" on public.health_periods for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
create policy "health_food_library_owner" on public.health_food_library for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
create policy "health_meals_owner" on public.health_meals for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
create policy "health_meal_items_owner" on public.health_meal_items for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
create policy "health_body_photos_owner" on public.health_body_photos for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
create policy "health_daily_summaries_owner" on public.health_daily_summaries for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
grant select on public.health_settings,public.health_periods,public.health_food_library,public.health_meals,public.health_meal_items,public.health_body_photos,public.health_daily_summaries to anon;
grant select,insert,update,delete on public.health_settings,public.health_periods,public.health_food_library,public.health_meals,public.health_meal_items,public.health_body_photos,public.health_daily_summaries to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('health-body-photos','health-body-photos',false,10485760,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=10485760,allowed_mime_types=array['image/jpeg','image/png','image/webp'];
create policy "health_photos_select_owner" on storage.objects for select to authenticated using(bucket_id='health-body-photos' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "health_photos_insert_owner" on storage.objects for insert to authenticated with check(bucket_id='health-body-photos' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "health_photos_update_owner" on storage.objects for update to authenticated using(bucket_id='health-body-photos' and (storage.foldername(name))[1]=auth.uid()::text) with check(bucket_id='health-body-photos' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "health_photos_delete_owner" on storage.objects for delete to authenticated using(bucket_id='health-body-photos' and (storage.foldername(name))[1]=auth.uid()::text);
