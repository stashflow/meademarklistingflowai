create or replace function public.accept_dealership_invite(invite_token text)
returns table (dealership_id uuid, dealership_name text, member_role text)
language plpgsql
security definer
set search_path = public
as $$
declare
  invite_row public.dealership_invites%rowtype;
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  select *
  into invite_row
  from public.dealership_invites
  where token = invite_token
  for update;

  if invite_row.id is null then
    raise exception 'Invalid invite link';
  end if;

  if invite_row.expires_at is not null and invite_row.expires_at < now() then
    raise exception 'Invite link expired';
  end if;

  if invite_row.used_at is not null
     and not exists (
       select 1
       from public.dealership_members
       where dealership_members.dealership_id = invite_row.dealership_id
         and dealership_members.user_id = current_user_id
         and dealership_members.status = 'active'
     ) then
    raise exception 'Invite link already used';
  end if;

  insert into public.dealership_members (dealership_id, user_id, role, status)
  values (
    invite_row.dealership_id,
    current_user_id,
    case when invite_row.role in ('manager', 'staff') then invite_row.role else 'staff' end,
    'active'
  )
  on conflict (dealership_id, user_id)
  do update set status = 'active';

  update public.profiles
  set active_dealership_id = invite_row.dealership_id,
      onboarding_completed = true,
      updated_at = now()
  where user_id = current_user_id;

  if invite_row.used_at is null then
    update public.dealership_invites
    set used_at = now()
    where id = invite_row.id;
  end if;

  return query
  select d.id, d.name, dm.role
  from public.dealerships d
  join public.dealership_members dm
    on dm.dealership_id = d.id
   and dm.user_id = current_user_id
  where d.id = invite_row.dealership_id;
end;
$$;

revoke all on function public.accept_dealership_invite(text) from public;
grant execute on function public.accept_dealership_invite(text) to authenticated;
