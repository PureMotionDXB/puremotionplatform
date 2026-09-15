-- Client account status: active / paused / suspended / terminated.
-- Cancelling a client's own spot in a class already existed (front-
-- desk booking's Cancel action, cancel_booking()) — this adds the
-- other half: blocking a client (paused, suspended, or terminated)
-- from making NEW bookings, whether self-service or admin-assisted.
-- Existing bookings are untouched — this only gates future ones.
-- Cancelling still works regardless of status, on purpose: someone
-- should always be able to give up a spot even if their account is
-- paused/suspended.
alter table clients add column if not exists account_status text not null default 'active'
  check (account_status in ('active', 'paused', 'suspended', 'terminated'));
alter table clients add column if not exists status_reason text;
alter table clients add column if not exists status_updated_at timestamptz;

create or replace function set_client_status(p_client_id uuid, p_status text, p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from staff where user_id = auth.uid() and role in ('admin', 'owner')) then
    raise exception 'Not authorized';
  end if;
  if p_status not in ('active', 'paused', 'suspended', 'terminated') then
    raise exception 'Invalid status';
  end if;

  update clients
    set account_status = p_status, status_reason = p_reason, status_updated_at = now()
  where id = p_client_id;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function set_client_status(uuid, text, text) to authenticated;

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

  if v_booked_count < v_occurrence.capacity then
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
    v_new_status := 'booked';
  elsif v_waitlist_count < 2 then
    v_new_status := 'waitlisted';
  else
    raise exception 'Class and waitlist are full';
  end if;

  insert into bookings (occurrence_id, client_id, status, credit_family)
  values (p_occurrence_id, v_client_id, v_new_status, v_occurrence.family);

  return jsonb_build_object('status', v_new_status);
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

  select co.date, c.time into v_old_occurrence
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

  if v_old_booking.status = 'booked' and not v_is_late then
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
      if v_promoted.credit_family = 'reformer' then
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

  if v_booked_count < v_new_occurrence.capacity then
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
    v_new_status := 'booked';
  elsif v_waitlist_count < 2 then
    v_new_status := 'waitlisted';
  else
    raise exception 'That class and its waitlist are full';
  end if;

  insert into bookings (occurrence_id, client_id, status, credit_family)
  values (p_new_occurrence_id, v_client_id, v_new_status, v_new_occurrence.family);

  return jsonb_build_object('status', v_new_status, 'promoted_booking_id', v_promoted_booking_id);
end;
$$;
