create table public.inventory_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  wine_id uuid not null references public.wines(id) on delete cascade,
  event_type text not null check (event_type in ('purchase', 'adjustment', 'consume', 'remove')),
  quantity_delta int not null check (quantity_delta <> 0),
  note text,
  source text,
  created_at timestamptz not null default now()
);

create index inventory_events_user_id_created_at_idx
on public.inventory_events (user_id, created_at desc);

create index inventory_events_wine_id_created_at_idx
on public.inventory_events (wine_id, created_at desc);

alter table public.inventory_events enable row level security;

create policy "Users can manage own inventory events"
on public.inventory_events for all
using (
  exists (
    select 1 from public.app_users
    where app_users.id = inventory_events.user_id
      and app_users.auth_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.app_users
    where app_users.id = inventory_events.user_id
      and app_users.auth_user_id = auth.uid()
  )
);

insert into public.inventory_events (
  user_id,
  wine_id,
  event_type,
  quantity_delta,
  note,
  source,
  created_at
)
select
  wines.user_id,
  wines.id,
  'purchase',
  wines.quantity,
  'Phase 2 backfill from existing wine quantity',
  'backfill',
  wines.created_at
from public.wines
where wines.quantity > 0
  and not exists (
    select 1
    from public.inventory_events
    where inventory_events.wine_id = wines.id
  );

create or replace function public.apply_inventory_event(
  p_user_id uuid,
  p_wine_id uuid,
  p_event_type text,
  p_quantity_delta int,
  p_note text default null,
  p_source text default null
)
returns public.inventory_events
language plpgsql
security definer
set search_path = public
as $$
declare
  current_quantity int;
  next_quantity int;
  inserted_event public.inventory_events;
begin
  if p_event_type not in ('purchase', 'adjustment', 'consume', 'remove') then
    raise exception 'Invalid inventory event type: %', p_event_type;
  end if;

  if p_quantity_delta = 0 then
    raise exception 'Inventory quantity_delta cannot be 0';
  end if;

  select quantity
  into current_quantity
  from public.wines
  where id = p_wine_id
    and user_id = p_user_id
  for update;

  if not found then
    raise exception 'Wine not found';
  end if;

  next_quantity := current_quantity + p_quantity_delta;

  if next_quantity < 0 then
    raise exception 'Inventory quantity cannot go below 0';
  end if;

  update public.wines
  set quantity = next_quantity
  where id = p_wine_id
    and user_id = p_user_id;

  insert into public.inventory_events (
    user_id,
    wine_id,
    event_type,
    quantity_delta,
    note,
    source
  )
  values (
    p_user_id,
    p_wine_id,
    p_event_type,
    p_quantity_delta,
    p_note,
    p_source
  )
  returning * into inserted_event;

  return inserted_event;
end;
$$;

create or replace function public.create_wine_with_purchase_event(
  p_user_id uuid,
  p_producer text,
  p_name text,
  p_vintage int,
  p_wine_type text,
  p_varietals text[],
  p_region text,
  p_country text,
  p_alcohol_pct numeric,
  p_quantity int,
  p_cost_per_bottle numeric,
  p_price_band text,
  p_price_source text,
  p_currency text,
  p_purchase_date date,
  p_location text,
  p_notes text,
  p_photo_path text,
  p_extraction_meta jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_wine_id uuid;
begin
  if p_quantity < 0 then
    raise exception 'Wine quantity cannot be negative';
  end if;

  insert into public.wines (
    user_id,
    producer,
    name,
    vintage,
    wine_type,
    varietals,
    region,
    country,
    alcohol_pct,
    quantity,
    cost_per_bottle,
    price_band,
    price_source,
    currency,
    purchase_date,
    location,
    notes,
    photo_path,
    extraction_meta
  )
  values (
    p_user_id,
    p_producer,
    p_name,
    p_vintage,
    p_wine_type,
    coalesce(p_varietals, '{}'),
    p_region,
    p_country,
    p_alcohol_pct,
    p_quantity,
    p_cost_per_bottle,
    p_price_band,
    p_price_source,
    coalesce(p_currency, 'USD'),
    p_purchase_date,
    p_location,
    p_notes,
    p_photo_path,
    p_extraction_meta
  )
  returning id into new_wine_id;

  if p_quantity > 0 then
    insert into public.inventory_events (
      user_id,
      wine_id,
      event_type,
      quantity_delta,
      note,
      source
    )
    values (
      p_user_id,
      new_wine_id,
      'purchase',
      p_quantity,
      'Initial capture quantity',
      'capture'
    );
  end if;

  return new_wine_id;
end;
$$;
