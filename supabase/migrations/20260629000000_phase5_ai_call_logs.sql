create table public.ai_call_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  feature text not null check (feature in ('label_extraction', 'recommendation', 'preference_update')),
  provider text not null,
  model text not null,
  status text not null check (status in ('success', 'fallback', 'error', 'blocked')),
  latency_ms int,
  fallback boolean not null default false,
  error_reason text,
  created_at timestamptz not null default now()
);

create index ai_call_logs_user_id_created_at_idx
on public.ai_call_logs (user_id, created_at desc);

create index ai_call_logs_user_id_feature_created_at_idx
on public.ai_call_logs (user_id, feature, created_at desc);

alter table public.ai_call_logs enable row level security;

create policy "Users can view own AI call logs"
on public.ai_call_logs for select
using (
  exists (
    select 1 from public.app_users
    where app_users.id = ai_call_logs.user_id
      and app_users.auth_user_id = auth.uid()
  )
);
