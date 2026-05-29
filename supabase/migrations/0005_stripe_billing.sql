alter table public.dealerships
  drop constraint if exists dealerships_subscription_status_check;

alter table public.dealerships
  add constraint dealerships_subscription_status_check
  check (subscription_status in (
    'trial',
    'starter_demo',
    'pro_demo',
    'unlimited_demo',
    'starter',
    'pro',
    'dealer_group',
    'past_due',
    'canceled'
  ));

alter table public.dealerships
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists stripe_price_id text,
  add column if not exists stripe_current_period_end timestamptz,
  add column if not exists trial_ends_at timestamptz,
  add column if not exists billing_email text;

create unique index if not exists dealerships_stripe_customer_id_idx
  on public.dealerships (stripe_customer_id)
  where stripe_customer_id is not null;

create unique index if not exists dealerships_stripe_subscription_id_idx
  on public.dealerships (stripe_subscription_id)
  where stripe_subscription_id is not null;
