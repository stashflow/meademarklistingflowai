alter table public.profiles
  add column if not exists animation_preference text not null default 'simple';

alter table public.profiles
  add column if not exists feature_settings jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_animation_preference_check'
  ) then
    alter table public.profiles
      add constraint profiles_animation_preference_check
      check (animation_preference in ('none','simple','amaze'));
  end if;
end;
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

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles_select_same_dealership'
  ) then
    create policy "profiles_select_same_dealership" on public.profiles for select using (
      auth.uid() = user_id
      or public.shares_dealership(auth.uid(), user_id)
    );
  end if;
end;
$$;
