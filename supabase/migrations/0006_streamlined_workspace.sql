alter table public.dealerships
  add column if not exists listing_defaults jsonb not null default '{
    "contactText": "",
    "defaultCTA": "",
    "financingLanguage": "",
    "warrantyLanguage": "",
    "platforms": {
      "facebook": {"tone": "friendly", "length": "standard"},
      "cargurus": {"tone": "professional", "length": "standard"},
      "website": {"tone": "professional", "length": "detailed"}
    }
  }'::jsonb;

create table if not exists public.vehicle_drafts (
  id uuid primary key default gen_random_uuid(),
  dealership_id uuid not null references public.dealerships(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  last_edited_by uuid references auth.users(id) on delete set null,
  listing_id uuid references public.listings(id) on delete set null,
  batch_item_id uuid references public.bulk_inventory_items(id) on delete set null,
  input_data jsonb not null default '{}'::jsonb,
  preferences jsonb not null default '{}'::jsonb,
  generated_output jsonb,
  current_step text not null default 'facts'
    check (current_step in ('facts','fill_in','copy')),
  active_platform text not null default 'facebook'
    check (active_platform in ('facebook','cargurus','website')),
  status text not null default 'draft'
    check (status in ('draft','ready','generated','published','archived')),
  title text,
  vin text,
  stock_number text,
  year text,
  make text,
  model text,
  trim text,
  exterior_color text,
  autosave_version integer not null default 1,
  last_generated_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vehicle_draft_sources (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null references public.vehicle_drafts(id) on delete cascade,
  dealership_id uuid not null references public.dealerships(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  source_type text not null default 'pasted_listing'
    check (source_type in ('pasted_listing','inventory_note','window_sticker','auction_note','other')),
  source_text text not null,
  extracted_data jsonb not null default '{}'::jsonb,
  conflicts jsonb not null default '[]'::jsonb,
  accepted_fields jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.vehicle_trim_research_cache (
  id uuid primary key default gen_random_uuid(),
  research_key text not null unique,
  year text not null,
  make text not null,
  model text not null,
  market text not null default 'US',
  trim_candidates jsonb not null default '[]'::jsonb,
  specification_matrix jsonb not null default '{}'::jsonb,
  distinguishing_questions jsonb not null default '[]'::jsonb,
  sources jsonb not null default '[]'::jsonb,
  confidence text not null default 'low'
    check (confidence in ('low','medium','high')),
  refreshed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists vehicle_drafts_dealership_updated_idx
  on public.vehicle_drafts (dealership_id, updated_at desc);
create index if not exists vehicle_drafts_batch_item_idx
  on public.vehicle_drafts (batch_item_id);
create unique index if not exists vehicle_drafts_active_batch_item_unique_idx
  on public.vehicle_drafts (batch_item_id)
  where batch_item_id is not null and status <> 'archived';
create index if not exists vehicle_draft_sources_draft_idx
  on public.vehicle_draft_sources (draft_id, created_at desc);
create index if not exists vehicle_trim_research_lookup_idx
  on public.vehicle_trim_research_cache (year, make, model, market);

alter table public.vehicle_drafts enable row level security;
alter table public.vehicle_draft_sources enable row level security;
alter table public.vehicle_trim_research_cache enable row level security;

drop policy if exists "vehicle_drafts_select_member" on public.vehicle_drafts;
create policy "vehicle_drafts_select_member" on public.vehicle_drafts for select
  using (public.is_dealership_member(auth.uid(), dealership_id));

drop policy if exists "vehicle_drafts_insert_member" on public.vehicle_drafts;
create policy "vehicle_drafts_insert_member" on public.vehicle_drafts for insert
  with check (
    public.is_dealership_member(auth.uid(), dealership_id)
    and auth.uid() = created_by
  );

drop policy if exists "vehicle_drafts_update_member" on public.vehicle_drafts;
create policy "vehicle_drafts_update_member" on public.vehicle_drafts for update
  using (public.is_dealership_member(auth.uid(), dealership_id))
  with check (public.is_dealership_member(auth.uid(), dealership_id));

drop policy if exists "vehicle_drafts_delete_owner_admin_or_creator" on public.vehicle_drafts;
create policy "vehicle_drafts_delete_owner_admin_or_creator" on public.vehicle_drafts for delete
  using (
    auth.uid() = created_by
    or public.has_dealership_role(auth.uid(), dealership_id, array['owner','admin'])
  );

drop policy if exists "vehicle_draft_sources_select_member" on public.vehicle_draft_sources;
create policy "vehicle_draft_sources_select_member" on public.vehicle_draft_sources for select
  using (public.is_dealership_member(auth.uid(), dealership_id));

drop policy if exists "vehicle_draft_sources_insert_member" on public.vehicle_draft_sources;
create policy "vehicle_draft_sources_insert_member" on public.vehicle_draft_sources for insert
  with check (public.is_dealership_member(auth.uid(), dealership_id));

drop policy if exists "vehicle_draft_sources_update_member" on public.vehicle_draft_sources;
create policy "vehicle_draft_sources_update_member" on public.vehicle_draft_sources for update
  using (public.is_dealership_member(auth.uid(), dealership_id))
  with check (public.is_dealership_member(auth.uid(), dealership_id));

drop policy if exists "vehicle_draft_sources_delete_member" on public.vehicle_draft_sources;
create policy "vehicle_draft_sources_delete_member" on public.vehicle_draft_sources for delete
  using (public.is_dealership_member(auth.uid(), dealership_id));

drop policy if exists "vehicle_trim_research_select_authenticated" on public.vehicle_trim_research_cache;
create policy "vehicle_trim_research_select_authenticated" on public.vehicle_trim_research_cache for select
  using (auth.role() = 'authenticated');
