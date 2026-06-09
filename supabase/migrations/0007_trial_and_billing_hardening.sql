alter table public.dealerships
  alter column trial_generation_limit set default 10;

update public.dealerships
set trial_generation_limit = 10,
    updated_at = now()
where trial_generation_limit = 35
  and subscription_status = 'trial';

drop policy if exists "generation_usage_insert_member" on public.generation_usage;
drop policy if exists "generation_usage_update_member" on public.generation_usage;
