create table if not exists public.app_admins (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  role text not null default 'founder_admin',
  created_at timestamptz not null default now()
);

alter table public.app_admins enable row level security;

create or replace function public.is_app_admin(target_email text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.app_admins
    where lower(email) = lower(target_email)
  );
$$;

do $$
begin
  if exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'listings'
      and constraint_name = 'listings_status_check'
  ) then
    alter table public.listings drop constraint listings_status_check;
  end if;
end $$;

alter table public.listings
  add constraint listings_status_check
  check (status in ('draft','pending_review','changes_requested','reviewed','approved','published'));

alter table public.listings
  add column if not exists approval_status text not null default 'draft'
    check (approval_status in ('draft','pending_review','changes_requested','approved','published')),
  add column if not exists review_requested_by uuid references auth.users(id),
  add column if not exists review_requested_at timestamptz,
  add column if not exists approved_by uuid references auth.users(id),
  add column if not exists approved_at timestamptz,
  add column if not exists quality_score integer,
  add column if not exists risk_level text default 'unknown'
    check (risk_level in ('low','medium','high','unknown')),
  add column if not exists risk_summary jsonb not null default '{}'::jsonb;

create table if not exists public.feature_events (
  id uuid primary key default gen_random_uuid(),
  dealership_id uuid references public.dealerships(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  feature text not null,
  action text not null,
  route text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  dealership_id uuid references public.dealerships(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  before_data jsonb,
  after_data jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.listing_quality_reports (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.listings(id) on delete cascade,
  dealership_id uuid not null references public.dealerships(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  score integer not null default 0,
  risk_level text not null default 'unknown' check (risk_level in ('low','medium','high','unknown')),
  missing_details jsonb not null default '[]'::jsonb,
  risk_claims jsonb not null default '[]'::jsonb,
  recommendations jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.bulk_inventory_batches (
  id uuid primary key default gen_random_uuid(),
  dealership_id uuid not null references public.dealerships(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  name text not null,
  source text not null default 'paste',
  row_count integer not null default 0,
  ready_count integer not null default 0,
  issue_count integer not null default 0,
  status text not null default 'draft' check (status in ('draft','validated','in_progress','completed','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bulk_inventory_items (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.bulk_inventory_batches(id) on delete cascade,
  dealership_id uuid not null references public.dealerships(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  row_index integer not null,
  input_data jsonb not null,
  status text not null default 'ready' check (status in ('ready','needs_info','generated','skipped')),
  validation_errors jsonb not null default '[]'::jsonb,
  listing_id uuid references public.listings(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.listing_images (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.listings(id) on delete cascade,
  dealership_id uuid not null references public.dealerships(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  image_url text,
  storage_path text,
  alt_text text,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists feature_events_dealer_created_idx on public.feature_events (dealership_id, created_at desc);
create index if not exists audit_logs_dealer_created_idx on public.audit_logs (dealership_id, created_at desc);
create index if not exists quality_reports_dealer_created_idx on public.listing_quality_reports (dealership_id, created_at desc);
create index if not exists bulk_batches_dealer_created_idx on public.bulk_inventory_batches (dealership_id, created_at desc);
create index if not exists bulk_items_batch_idx on public.bulk_inventory_items (batch_id, row_index);
create index if not exists listing_images_listing_idx on public.listing_images (listing_id, sort_order);

alter table public.feature_events enable row level security;
alter table public.audit_logs enable row level security;
alter table public.listing_quality_reports enable row level security;
alter table public.bulk_inventory_batches enable row level security;
alter table public.bulk_inventory_items enable row level security;
alter table public.listing_images enable row level security;

drop policy if exists "app_admins_select_self" on public.app_admins;
create policy "app_admins_select_self" on public.app_admins for select
  using (public.is_app_admin((auth.jwt() ->> 'email')));

drop policy if exists "feature_events_insert_member" on public.feature_events;
create policy "feature_events_insert_member" on public.feature_events for insert
  with check (dealership_id is null or public.is_dealership_member(auth.uid(), dealership_id));

drop policy if exists "feature_events_select_owner_admin" on public.feature_events;
create policy "feature_events_select_owner_admin" on public.feature_events for select
  using (
    dealership_id is not null
    and public.has_dealership_role(auth.uid(), dealership_id, array['owner','admin'])
  );

drop policy if exists "audit_logs_insert_member" on public.audit_logs;
create policy "audit_logs_insert_member" on public.audit_logs for insert
  with check (dealership_id is null or public.is_dealership_member(auth.uid(), dealership_id));

drop policy if exists "audit_logs_select_member" on public.audit_logs;
create policy "audit_logs_select_member" on public.audit_logs for select
  using (dealership_id is not null and public.is_dealership_member(auth.uid(), dealership_id));

drop policy if exists "quality_reports_select_member" on public.listing_quality_reports;
create policy "quality_reports_select_member" on public.listing_quality_reports for select
  using (public.is_dealership_member(auth.uid(), dealership_id));

drop policy if exists "quality_reports_insert_member" on public.listing_quality_reports;
create policy "quality_reports_insert_member" on public.listing_quality_reports for insert
  with check (public.is_dealership_member(auth.uid(), dealership_id));

drop policy if exists "bulk_batches_select_member" on public.bulk_inventory_batches;
create policy "bulk_batches_select_member" on public.bulk_inventory_batches for select
  using (public.is_dealership_member(auth.uid(), dealership_id));

drop policy if exists "bulk_batches_insert_member" on public.bulk_inventory_batches;
create policy "bulk_batches_insert_member" on public.bulk_inventory_batches for insert
  with check (public.is_dealership_member(auth.uid(), dealership_id) and auth.uid() = created_by);

drop policy if exists "bulk_batches_update_member" on public.bulk_inventory_batches;
create policy "bulk_batches_update_member" on public.bulk_inventory_batches for update
  using (public.is_dealership_member(auth.uid(), dealership_id))
  with check (public.is_dealership_member(auth.uid(), dealership_id));

drop policy if exists "bulk_items_select_member" on public.bulk_inventory_items;
create policy "bulk_items_select_member" on public.bulk_inventory_items for select
  using (public.is_dealership_member(auth.uid(), dealership_id));

drop policy if exists "bulk_items_insert_member" on public.bulk_inventory_items;
create policy "bulk_items_insert_member" on public.bulk_inventory_items for insert
  with check (public.is_dealership_member(auth.uid(), dealership_id) and auth.uid() = created_by);

drop policy if exists "bulk_items_update_member" on public.bulk_inventory_items;
create policy "bulk_items_update_member" on public.bulk_inventory_items for update
  using (public.is_dealership_member(auth.uid(), dealership_id))
  with check (public.is_dealership_member(auth.uid(), dealership_id));

drop policy if exists "listing_images_select_member" on public.listing_images;
create policy "listing_images_select_member" on public.listing_images for select
  using (public.is_dealership_member(auth.uid(), dealership_id));

drop policy if exists "listing_images_insert_member" on public.listing_images;
create policy "listing_images_insert_member" on public.listing_images for insert
  with check (public.is_dealership_member(auth.uid(), dealership_id));

drop policy if exists "listing_images_update_member" on public.listing_images;
create policy "listing_images_update_member" on public.listing_images for update
  using (public.is_dealership_member(auth.uid(), dealership_id))
  with check (public.is_dealership_member(auth.uid(), dealership_id));

drop policy if exists "listing_images_delete_owner_admin" on public.listing_images;
create policy "listing_images_delete_owner_admin" on public.listing_images for delete
  using (public.has_dealership_role(auth.uid(), dealership_id, array['owner','admin']));
