create extension if not exists "pgcrypto";

create table public.app_users (
  id uuid primary key,
  auth_user_id uuid unique references auth.users(id) on delete set null,
  email text,
  created_at timestamptz not null default now()
);

create table public.wines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  producer text not null,
  name text not null,
  vintage int,
  wine_type text not null check (wine_type in ('red', 'white', 'rose', 'sparkling', 'dessert', 'fortified')),
  varietals text[] not null default '{}',
  region text,
  country text,
  alcohol_pct numeric,
  quantity int not null default 1 check (quantity >= 0),
  cost_per_bottle numeric check (cost_per_bottle is null or cost_per_bottle >= 0),
  price_band text check (price_band in ('under_100', '101_200', '201_300', '301_500', '500_plus')),
  price_source text check (price_source in ('user', 'web_estimate', 'unknown')),
  currency text not null default 'USD',
  purchase_date date,
  location text,
  notes text,
  photo_path text,
  extraction_meta jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tastings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  wine_id uuid not null references public.wines(id) on delete cascade,
  rating int check (rating between 1 and 5),
  notes text,
  paired_with text,
  tasted_on date not null default current_date,
  created_at timestamptz not null default now()
);

create table public.preference_profiles (
  user_id uuid primary key references public.app_users(id) on delete cascade,
  structured jsonb not null default '{}',
  summary text not null default '',
  updated_at timestamptz not null default now()
);

create table public.recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  occasion text not null,
  cuisine text not null,
  budget_min numeric,
  budget_max numeric,
  result jsonb not null default '{}',
  accepted_wine_id uuid references public.wines(id) on delete set null,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger wines_set_updated_at
before update on public.wines
for each row execute function public.set_updated_at();

alter table public.app_users enable row level security;
alter table public.wines enable row level security;
alter table public.tastings enable row level security;
alter table public.preference_profiles enable row level security;
alter table public.recommendations enable row level security;

create policy "Users can view own app user"
on public.app_users for select
using (auth.uid() = auth_user_id);

create policy "Users can view own wines"
on public.wines for select
using (
  exists (
    select 1 from public.app_users
    where app_users.id = wines.user_id
      and app_users.auth_user_id = auth.uid()
  )
);

create policy "Users can manage own wines"
on public.wines for all
using (
  exists (
    select 1 from public.app_users
    where app_users.id = wines.user_id
      and app_users.auth_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.app_users
    where app_users.id = wines.user_id
      and app_users.auth_user_id = auth.uid()
  )
);

create policy "Users can manage own tastings"
on public.tastings for all
using (
  exists (
    select 1 from public.app_users
    where app_users.id = tastings.user_id
      and app_users.auth_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.app_users
    where app_users.id = tastings.user_id
      and app_users.auth_user_id = auth.uid()
  )
);

create policy "Users can manage own preference profile"
on public.preference_profiles for all
using (
  exists (
    select 1 from public.app_users
    where app_users.id = preference_profiles.user_id
      and app_users.auth_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.app_users
    where app_users.id = preference_profiles.user_id
      and app_users.auth_user_id = auth.uid()
  )
);

create policy "Users can manage own recommendations"
on public.recommendations for all
using (
  exists (
    select 1 from public.app_users
    where app_users.id = recommendations.user_id
      and app_users.auth_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.app_users
    where app_users.id = recommendations.user_id
      and app_users.auth_user_id = auth.uid()
  )
);
