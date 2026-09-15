-- Real Unlimited Membership support: a time-boxed pass that lets a
-- client book a given class family with no credit deducted at all,
-- for as long as the membership covers the class's date. This is a
-- genuinely different mechanism from credits, not a reuse of them —
-- a membership holder's credit balance is untouched by booking.
--
-- The late-cancellation fee still applies to membership bookings
-- exactly like credit bookings — that fee is about the studio's lost
-- capacity when someone bails late, not about what funded the spot.
create table if not exists client_memberships (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  family text not null check (family in ('reformer', 'mat')),
  starts_at date not null,
  ends_at date not null,
  package_name text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);
alter table client_memberships enable row level security;

create policy "Clients read own memberships" on client_memberships
  for select using (auth.uid() = client_id);
create policy "Admin read all memberships" on client_memberships
  for select
  using (exists (select 1 from staff where staff.user_id = auth.uid() and staff.role in ('admin', 'owner')));
-- No direct write policy — all writes go through grant_membership()
-- below (admin/owner) or the Stripe webhook (service role, bypasses
-- RLS entirely, so it needs no policy here).

create or replace function has_active_membership(p_client_id uuid, p_family text, p_date date)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from client_memberships
    where client_id = p_client_id and family = p_family
      and starts_at <= p_date and ends_at >= p_date
  );
$$;

create or replace function grant_membership(
  p_client_id uuid,
  p_family text,
  p_starts_at date,
  p_ends_at date,
  p_package_name text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff_id uuid := auth.uid();
begin
  if not exists (select 1 from staff where staff.user_id = v_staff_id and staff.role in ('admin', 'owner')) then
    raise exception 'Not authorized';
  end if;
  if p_family not in ('reformer', 'mat') then
    raise exception 'Invalid family';
  end if;
  if p_ends_at < p_starts_at then
    raise exception 'End date must be on or after the start date';
  end if;

  insert into client_memberships (client_id, family, starts_at, ends_at, package_name, created_by)
  values (p_client_id, p_family, p_starts_at, p_ends_at, p_package_name, v_staff_id);

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function grant_membership(uuid, text, date, date, text) to authenticated;

-- Bookings now record whether a spot was covered by a membership
-- (true) rather than a deducted credit (false) — cancel_booking()
-- uses this to know whether there's ever a credit to refund.
alter table bookings add column if not exists via_membership boolean not null default false;

create or replace function book_class(p_occurrence_id uuid, p_client_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_client_id uuid;
  v_occurrence record;
  v_client record;
  v_booked_count int;
  v_waitlist_count int;
  v_new_status text;
  v_has_membership boolean;
begin
  if v_actor_id is null then
    raise exception 'Not signed in';
  end if;

  if p_client_id is not null and p_client_id <> v_actor_id then
    if not exists (select 1 from staff where user_id = v_actor_id and role in ('admin', 'owner')) then
      raise exception 'Not authorized';
    end if;
    v_client_id := p_client_id;
  else
    v_client_id := v_actor_id;
  end if;

  select co.id, co.date, c.family, c.ladies_only, c.capacity, c.time
    into v_occurrence
  from class_occurrences co
  join classes c on c.id = co.class_id
  where co.id = p_occurrence_id;

  if not found then
    raise exception 'Class not found';
  end if;

  if (v_occurrence.date + v_occurrence.time::time) < now() then
    raise exception 'This class has already happened';
  end if;

  select * into v_client from clients where id = v_client_id;
  if not found then
    raise exception 'Client profile not found';
  end if;

  if v_client.account_status = 'paused' then
    raise exception 'This account is currently paused. Contact the studio to resume booking.';
  elsif v_client.account_status = 'suspended' then
    raise exception 'This account is currently suspended. Please contact the studio.';
  elsif v_client.account_status = 'terminated' then
    raise exception 'This account is no longer active.';
  end if;

  if v_occurrence.ladies_only and v_client.gender <> 'female' then
    raise exception 'This class is restricted to female clients';
  end if;

  if exists (
    select 1 from bookings
    where occurrence_id = p_occurrence_id and client_id = v_client_id and status in ('booked', 'waitlisted')
  ) then
    raise exception 'This client already has a spot in this class';
  end if;

  select count(*) into v_booked_count from bookings
    where occurrence_id = p_occurrence_id and status = 'booked';
  select count(*) into v_waitlist_count from bookings
    where occurrence_id = p_occurrence_id and status = 'waitlisted';

  v_has_membership := has_active_membership(v_client_id, v_occurrence.family, v_occurrence.date);

  if v_booked_count < v_occurrence.capacity then
    if not v_has_membership then
      if v_occurrence.family = 'reformer' then
        if v_client.reformer_credits < 1 then
          raise exception 'Not enough Reformer credits';
        end if;
        update clients set reformer_credits = reformer_credits - 1 where id = v_client_id;
      else
        if v_client.mat_credits < 1 then
          raise exception 'Not enough Mat credits';
        end if;
        update clients set mat_credits = mat_credits - 1 where id = v_client_id;
      end if;
    end if;
    v_new_status := 'booked';
  elsif v_waitlist_count < 2 then
    v_new_status := 'waitlisted';
  else
    raise exception 'Class and waitlist are full';
  end if;

  insert into bookings (occurrence_id, client_id, status, credit_family, via_membership)
  values (p_occurrence_id, v_client_id, v_new_status, v_occurrence.family, v_has_membership and v_new_status = 'booked');

  return jsonb_build_object('status', v_new_status);
end;
$$;

create or replace function cancel_booking(p_booking_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_is_admin boolean;
  v_booking record;
  v_occurrence record;
  v_promoted record;
  v_promoted_booking_id uuid;
  v_promoted_has_membership boolean;
  v_is_late boolean;
begin
  select * into v_booking from bookings where id = p_booking_id;
  if not found then
    raise exception 'Booking not found';
  end if;

  select exists(select 1 from staff where user_id = v_actor_id and role in ('admin', 'owner')) into v_is_admin;
  if not (v_is_admin or v_booking.client_id = v_actor_id) then
    raise exception 'Not authorized';
  end if;

  if v_booking.status not in ('booked', 'waitlisted') then
    raise exception 'Booking already cancelled';
  end if;

  select co.date, c.time, c.family into v_occurrence
  from class_occurrences co join classes c on c.id = co.class_id
  where co.id = v_booking.occurrence_id;

  v_is_late := (v_occurrence.date + v_occurrence.time::time) - now() < interval '12 hours';

  if v_booking.status = 'booked' and not v_is_late and not v_booking.via_membership then
    if v_booking.credit_family = 'reformer' then
      update clients set reformer_credits = reformer_credits + 1 where id = v_booking.client_id;
    else
      update clients set mat_credits = mat_credits + 1 where id = v_booking.client_id;
    end if;
  end if;

  if v_booking.status = 'booked' and v_is_late then
    insert into no_show_fees (booking_id, client_id, reason)
    values (p_booking_id, v_booking.client_id, 'late_cancel');
  end if;

  update bookings set status = 'cancelled', cancelled_at = now() where id = p_booking_id;

  if v_booking.status = 'booked' then
    for v_promoted in
      select * from bookings
      where occurrence_id = v_booking.occurrence_id and status = 'waitlisted'
      order by created_at asc
    loop
      v_promoted_has_membership := has_active_membership(v_promoted.client_id, v_occurrence.family, v_occurrence.date);
      if v_promoted_has_membership then
        update bookings set status = 'booked', via_membership = true where id = v_promoted.id;
        v_promoted_booking_id := v_promoted.id;
        exit;
      elsif v_promoted.credit_family = 'reformer' then
        if (select reformer_credits from clients where id = v_promoted.client_id) >= 1 then
          update clients set reformer_credits = reformer_credits - 1 where id = v_promoted.client_id;
          update bookings set status = 'booked' where id = v_promoted.id;
          v_promoted_booking_id := v_promoted.id;
          exit;
        end if;
      else
        if (select mat_credits from clients where id = v_promoted.client_id) >= 1 then
          update clients set mat_credits = mat_credits - 1 where id = v_promoted.client_id;
          update bookings set status = 'booked' where id = v_promoted.id;
          v_promoted_booking_id := v_promoted.id;
          exit;
        end if;
      end if;
    end loop;
  end if;

  return jsonb_build_object('ok', true, 'promoted_booking_id', v_promoted_booking_id);
end;
$$;

create or replace function reschedule_booking(p_old_booking_id uuid, p_new_occurrence_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client_id uuid := auth.uid();
  v_old_booking record;
  v_old_occurrence record;
  v_new_occurrence record;
  v_client record;
  v_is_late boolean;
  v_booked_count int;
  v_waitlist_count int;
  v_new_status text;
  v_promoted record;
  v_promoted_booking_id uuid;
  v_promoted_has_membership boolean;
  v_has_membership boolean;
begin
  if v_client_id is null then
    raise exception 'Not signed in';
  end if;

  select * into v_old_booking from bookings
    where id = p_old_booking_id and client_id = v_client_id;
  if not found then
    raise exception 'Booking not found';
  end if;
  if v_old_booking.status not in ('booked', 'waitlisted') then
    raise exception 'This booking can no longer be rescheduled';
  end if;
  if p_new_occurrence_id = v_old_booking.occurrence_id then
    raise exception 'That is already your class';
  end if;

  select co.date, c.time, c.family into v_old_occurrence
  from class_occurrences co join classes c on c.id = co.class_id
  where co.id = v_old_booking.occurrence_id;

  select co.id, co.date, c.family, c.ladies_only, c.capacity, c.time
    into v_new_occurrence
  from class_occurrences co
  join classes c on c.id = co.class_id
  where co.id = p_new_occurrence_id;
  if not found then
    raise exception 'Class not found';
  end if;
  if (v_new_occurrence.date + v_new_occurrence.time::time) < now() then
    raise exception 'This class has already happened';
  end if;

  select * into v_client from clients where id = v_client_id;
  if not found then
    raise exception 'Client profile not found';
  end if;

  if v_client.account_status = 'paused' then
    raise exception 'This account is currently paused. Contact the studio to resume booking.';
  elsif v_client.account_status = 'suspended' then
    raise exception 'This account is currently suspended. Please contact the studio.';
  elsif v_client.account_status = 'terminated' then
    raise exception 'This account is no longer active.';
  end if;

  if v_new_occurrence.ladies_only and v_client.gender <> 'female' then
    raise exception 'This class is restricted to female clients';
  end if;
  if exists (
    select 1 from bookings
    where occurrence_id = p_new_occurrence_id and client_id = v_client_id and status in ('booked', 'waitlisted')
  ) then
    raise exception 'You already have a spot in this class';
  end if;

  v_is_late := v_old_booking.status = 'booked'
    and (v_old_occurrence.date + v_old_occurrence.time::time) - now() < interval '12 hours';

  if v_old_booking.status = 'booked' and not v_is_late and not v_old_booking.via_membership then
    if v_old_booking.credit_family = 'reformer' then
      update clients set reformer_credits = reformer_credits + 1 where id = v_client_id;
    else
      update clients set mat_credits = mat_credits + 1 where id = v_client_id;
    end if;
  end if;

  if v_old_booking.status = 'booked' and v_is_late then
    insert into no_show_fees (booking_id, client_id, reason)
    values (p_old_booking_id, v_client_id, 'late_cancel');
  end if;

  update bookings set status = 'cancelled', cancelled_at = now() where id = p_old_booking_id;

  if v_old_booking.status = 'booked' then
    for v_promoted in
      select * from bookings
      where occurrence_id = v_old_booking.occurrence_id and status = 'waitlisted'
      order by created_at asc
    loop
      v_promoted_has_membership := has_active_membership(v_promoted.client_id, v_old_occurrence.family, v_old_occurrence.date);
      if v_promoted_has_membership then
        update bookings set status = 'booked', via_membership = true where id = v_promoted.id;
        v_promoted_booking_id := v_promoted.id;
        exit;
      elsif v_promoted.credit_family = 'reformer' then
        if (select reformer_credits from clients where id = v_promoted.client_id) >= 1 then
          update clients set reformer_credits = reformer_credits - 1 where id = v_promoted.client_id;
          update bookings set status = 'booked' where id = v_promoted.id;
          v_promoted_booking_id := v_promoted.id;
          exit;
        end if;
      else
        if (select mat_credits from clients where id = v_promoted.client_id) >= 1 then
          update clients set mat_credits = mat_credits - 1 where id = v_promoted.client_id;
          update bookings set status = 'booked' where id = v_promoted.id;
          v_promoted_booking_id := v_promoted.id;
          exit;
        end if;
      end if;
    end loop;
  end if;

  select * into v_client from clients where id = v_client_id;

  select count(*) into v_booked_count from bookings
    where occurrence_id = p_new_occurrence_id and status = 'booked';
  select count(*) into v_waitlist_count from bookings
    where occurrence_id = p_new_occurrence_id and status = 'waitlisted';

  v_has_membership := has_active_membership(v_client_id, v_new_occurrence.family, v_new_occurrence.date);

  if v_booked_count < v_new_occurrence.capacity then
    if not v_has_membership then
      if v_new_occurrence.family = 'reformer' then
        if v_client.reformer_credits < 1 then
          raise exception 'Not enough Reformer credits for the new class';
        end if;
        update clients set reformer_credits = reformer_credits - 1 where id = v_client_id;
      else
        if v_client.mat_credits < 1 then
          raise exception 'Not enough Mat credits for the new class';
        end if;
        update clients set mat_credits = mat_credits - 1 where id = v_client_id;
      end if;
    end if;
    v_new_status := 'booked';
  elsif v_waitlist_count < 2 then
    v_new_status := 'waitlisted';
  else
    raise exception 'That class and its waitlist are full';
  end if;

  insert into bookings (occurrence_id, client_id, status, credit_family, via_membership)
  values (p_new_occurrence_id, v_client_id, v_new_status, v_new_occurrence.family, v_has_membership and v_new_status = 'booked');

  return jsonb_build_object('status', v_new_status, 'promoted_booking_id', v_promoted_booking_id);
end;
$$;
