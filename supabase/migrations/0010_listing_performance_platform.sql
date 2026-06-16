alter table public.listings
  add column if not exists listing_score integer,
  add column if not exists completeness_score integer,
  add column if not exists seo_score integer,
  add column if not exists conversion_score integer,
  add column if not exists platform_score integer,
  add column if not exists compliance_score integer,
  add column if not exists lead_potential_score integer,
  add column if not exists search_visibility_score integer,
  add column if not exists missing_fields jsonb not null default '[]'::jsonb,
  add column if not exists risk_flags jsonb not null default '[]'::jsonb,
  add column if not exists suggested_fixes jsonb not null default '[]'::jsonb,
  add column if not exists photo_checklist jsonb not null default '[]'::jsonb,
  add column if not exists days_listed integer not null default 0,
  add column if not exists last_optimized_at timestamptz;

create index if not exists listings_dealership_listing_score_idx
  on public.listings (dealership_id, listing_score asc nulls last);

create index if not exists listings_dealership_compliance_score_idx
  on public.listings (dealership_id, compliance_score asc nulls last);

create index if not exists listings_dealership_lead_potential_idx
  on public.listings (dealership_id, lead_potential_score asc nulls last);
