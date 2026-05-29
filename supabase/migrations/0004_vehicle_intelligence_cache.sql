create table if not exists public.vehicle_model_intelligence (
  id uuid primary key default gen_random_uuid(),
  model_key text not null unique,
  year text not null,
  make text not null,
  model text not null,
  trim text,
  safety_data jsonb not null default '{}'::jsonb,
  recall_data jsonb not null default '{}'::jsonb,
  ai_summary jsonb not null default '{}'::jsonb,
  intelligence_score integer not null default 0,
  sources jsonb not null default '[]'::jsonb,
  refreshed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists vehicle_model_intelligence_lookup_idx
  on public.vehicle_model_intelligence (year, make, model);

alter table public.vehicle_model_intelligence enable row level security;

drop policy if exists "vehicle_model_intelligence_select_authenticated" on public.vehicle_model_intelligence;
create policy "vehicle_model_intelligence_select_authenticated"
  on public.vehicle_model_intelligence for select
  using (auth.role() = 'authenticated');
