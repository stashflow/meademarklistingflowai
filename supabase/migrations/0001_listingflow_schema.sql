create extension if not exists "pgcrypto";

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text,
  email text,
  role text,
  onboarding_completed boolean not null default false,
  active_dealership_id uuid,
  animation_preference text not null default 'simple' check (animation_preference in ('none','simple','amaze')),
  feature_settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.dealerships (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references auth.users(id) on delete set null,
  name text not null,
  website text,
  phone text,
  location text,
  monthly_vehicle_volume text,
  default_tone text,
  default_cta text,
  default_disclaimer text,
  trial_generation_limit integer not null default 35,
  subscription_status text not null default 'trial' check (subscription_status in ('trial','starter_demo','pro_demo','unlimited_demo')),
  fake_paid_mode boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add constraint profiles_active_dealership_fk
  foreign key (active_dealership_id) references public.dealerships(id) on delete set null;

create table public.dealership_members (
  id uuid primary key default gen_random_uuid(),
  dealership_id uuid not null references public.dealerships(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','admin','manager','staff')),
  status text not null default 'active',
  created_at timestamptz not null default now(),
  unique (dealership_id, user_id)
);

alter table public.dealership_members
  add constraint dealership_members_profile_fk
  foreign key (user_id) references public.profiles(user_id) on delete cascade;

create table public.dealership_invites (
  id uuid primary key default gen_random_uuid(),
  dealership_id uuid not null references public.dealerships(id) on delete cascade,
  token text not null unique,
  role text not null default 'staff' check (role in ('owner','admin','manager','staff')),
  created_by uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.join_requests (
  id uuid primary key default gen_random_uuid(),
  dealership_id uuid not null references public.dealerships(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  message text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id),
  unique (dealership_id, user_id)
);

alter table public.join_requests
  add constraint join_requests_profile_fk
  foreign key (user_id) references public.profiles(user_id) on delete cascade;

create table public.dealership_style_profiles (
  id uuid primary key default gen_random_uuid(),
  dealership_id uuid not null unique references public.dealerships(id) on delete cascade,
  voice_summary text,
  formatting_rules jsonb,
  preferred_phrases jsonb,
  banned_phrases jsonb,
  default_cta text,
  default_disclaimer text,
  platform_preferences jsonb,
  example_listings jsonb,
  ai_style_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.style_examples (
  id uuid primary key default gen_random_uuid(),
  dealership_id uuid not null references public.dealerships(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null,
  example_text text not null,
  platform text,
  notes text,
  created_at timestamptz not null default now()
);

create table public.generation_usage (
  id uuid primary key default gen_random_uuid(),
  dealership_id uuid not null references public.dealerships(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  month_key text not null,
  generation_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (dealership_id, month_key)
);

create table public.listings (
  id uuid primary key default gen_random_uuid(),
  dealership_id uuid not null references public.dealerships(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  vin text,
  year text,
  make text,
  model text,
  trim text,
  mileage integer,
  price numeric,
  condition text,
  input_data jsonb not null,
  generated_output jsonb not null,
  status text not null default 'draft' check (status in ('draft','reviewed','published')),
  tags jsonb,
  internal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.early_access_leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text not null,
  email text not null,
  monthly_vehicle_volume text not null,
  biggest_challenge text not null,
  created_at timestamptz not null default now()
);

create table public.rate_limits (
  id uuid primary key default gen_random_uuid(),
  key text not null,
  route text not null,
  count integer not null default 0,
  window_start timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index listings_dealership_search_idx on public.listings (dealership_id, created_at desc);
create index generation_usage_dealer_month_idx on public.generation_usage (dealership_id, month_key);
create index rate_limits_lookup_idx on public.rate_limits (key, route, window_start);

create or replace function public.is_dealership_member(target_user_id uuid, target_dealership_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.dealership_members
    where user_id = target_user_id
      and dealership_id = target_dealership_id
      and status = 'active'
  );
$$;

create or replace function public.has_dealership_role(target_user_id uuid, target_dealership_id uuid, roles text[])
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.dealership_members
    where user_id = target_user_id
      and dealership_id = target_dealership_id
      and status = 'active'
      and role = any(roles)
  );
$$;

create or replace function public.shares_dealership(target_user_id uuid, other_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.dealership_members mine
    join public.dealership_members teammate
      on teammate.dealership_id = mine.dealership_id
    where mine.user_id = target_user_id
      and mine.status = 'active'
      and teammate.user_id = other_user_id
      and teammate.status = 'active'
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, full_name, email)
  values (new.id, new.raw_user_meta_data->>'full_name', new.email)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.dealerships enable row level security;
alter table public.dealership_members enable row level security;
alter table public.dealership_invites enable row level security;
alter table public.join_requests enable row level security;
alter table public.dealership_style_profiles enable row level security;
alter table public.style_examples enable row level security;
alter table public.generation_usage enable row level security;
alter table public.listings enable row level security;
alter table public.early_access_leads enable row level security;
alter table public.rate_limits enable row level security;

create policy "profiles_select_own" on public.profiles for select using (auth.uid() = user_id);
create policy "profiles_select_same_dealership" on public.profiles for select using (
  auth.uid() = user_id
  or public.shares_dealership(auth.uid(), user_id)
);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = user_id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "dealerships_insert_authenticated" on public.dealerships for insert with check (auth.role() = 'authenticated');
create policy "dealerships_select_authenticated" on public.dealerships for select using (auth.role() = 'authenticated');
create policy "dealerships_update_owner_admin" on public.dealerships for update
  using (public.has_dealership_role(auth.uid(), id, array['owner','admin']))
  with check (public.has_dealership_role(auth.uid(), id, array['owner','admin']));

create policy "members_select_same_dealership" on public.dealership_members for select
  using (public.is_dealership_member(auth.uid(), dealership_id));
create policy "members_insert_creator_or_admin" on public.dealership_members for insert
  with check (
    public.has_dealership_role(auth.uid(), dealership_id, array['owner','admin'])
    or exists (
      select 1 from public.dealerships
      where dealerships.id = dealership_id
        and dealerships.created_by = auth.uid()
        and dealership_members.user_id = auth.uid()
        and dealership_members.role = 'owner'
    )
  );
create policy "members_update_owner_admin" on public.dealership_members for update
  using (public.has_dealership_role(auth.uid(), dealership_id, array['owner','admin']))
  with check (public.has_dealership_role(auth.uid(), dealership_id, array['owner','admin']));

create policy "invites_select_authenticated" on public.dealership_invites for select using (auth.role() = 'authenticated');
create policy "invites_insert_owner_admin" on public.dealership_invites for insert
  with check (public.has_dealership_role(auth.uid(), dealership_id, array['owner','admin']));
create policy "invites_update_owner_admin_or_joiner" on public.dealership_invites for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "join_requests_select_owner_admin_or_self" on public.join_requests for select
  using (auth.uid() = user_id or public.has_dealership_role(auth.uid(), dealership_id, array['owner','admin']));
create policy "join_requests_insert_self" on public.join_requests for insert
  with check (auth.uid() = user_id);
create policy "join_requests_update_owner_admin" on public.join_requests for update
  using (public.has_dealership_role(auth.uid(), dealership_id, array['owner','admin']))
  with check (public.has_dealership_role(auth.uid(), dealership_id, array['owner','admin']));

create policy "style_profiles_select_member" on public.dealership_style_profiles for select
  using (public.is_dealership_member(auth.uid(), dealership_id));
create policy "style_profiles_upsert_owner_admin" on public.dealership_style_profiles for all
  using (public.has_dealership_role(auth.uid(), dealership_id, array['owner','admin']))
  with check (public.has_dealership_role(auth.uid(), dealership_id, array['owner','admin']));

create policy "style_examples_select_member" on public.style_examples for select
  using (public.is_dealership_member(auth.uid(), dealership_id));
create policy "style_examples_insert_member" on public.style_examples for insert
  with check (public.is_dealership_member(auth.uid(), dealership_id));
create policy "style_examples_update_owner_admin" on public.style_examples for update
  using (public.has_dealership_role(auth.uid(), dealership_id, array['owner','admin']))
  with check (public.has_dealership_role(auth.uid(), dealership_id, array['owner','admin']));

create policy "generation_usage_select_member" on public.generation_usage for select
  using (public.is_dealership_member(auth.uid(), dealership_id));
create policy "generation_usage_insert_member" on public.generation_usage for insert
  with check (public.is_dealership_member(auth.uid(), dealership_id));
create policy "generation_usage_update_member" on public.generation_usage for update
  using (public.is_dealership_member(auth.uid(), dealership_id))
  with check (public.is_dealership_member(auth.uid(), dealership_id));

create policy "listings_select_member" on public.listings for select
  using (public.is_dealership_member(auth.uid(), dealership_id));
create policy "listings_insert_member" on public.listings for insert
  with check (public.is_dealership_member(auth.uid(), dealership_id) and auth.uid() = created_by);
create policy "listings_update_member" on public.listings for update
  using (public.is_dealership_member(auth.uid(), dealership_id))
  with check (public.is_dealership_member(auth.uid(), dealership_id));
create policy "listings_delete_owner_admin" on public.listings for delete
  using (public.has_dealership_role(auth.uid(), dealership_id, array['owner','admin']));

-- Service role writes early access leads and rate limits from route handlers.
