insert into public.app_users (id, email)
values ('11111111-1111-1111-1111-111111111111', 'owner@example.com')
on conflict (id) do nothing;

insert into public.wines (
  user_id,
  producer,
  name,
  vintage,
  wine_type,
  varietals,
  region,
  country,
  quantity,
  cost_per_bottle,
  price_band,
  price_source,
  location,
  notes
)
values
  (
    '11111111-1111-1111-1111-111111111111',
    'Ridge',
    'Geyserville',
    2021,
    'red',
    array['Zinfandel', 'Carignan', 'Petite Sirah'],
    'Alexander Valley',
    'USA',
    2,
    55,
    'under_100',
    'user',
    'Rack A',
    'Seed bottle for Phase 0.'
  ),
  (
    '11111111-1111-1111-1111-111111111111',
    'Domaine Huet',
    'Vouvray Le Mont Sec',
    2020,
    'white',
    array['Chenin Blanc'],
    'Loire Valley',
    'France',
    1,
    68,
    'under_100',
    'user',
    'Rack B',
    'Seed bottle for Phase 0.'
  )
on conflict do nothing;
