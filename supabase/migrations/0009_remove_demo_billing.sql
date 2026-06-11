update public.dealerships
set
  subscription_status = 'trial',
  fake_paid_mode = false,
  updated_at = now()
where subscription_status in ('starter_demo', 'pro_demo', 'unlimited_demo');

alter table public.dealerships
  drop constraint if exists dealerships_subscription_status_check;

alter table public.dealerships
  add constraint dealerships_subscription_status_check
  check (subscription_status in (
    'trial',
    'starter',
    'pro',
    'dealer_group',
    'past_due',
    'canceled'
  ));
