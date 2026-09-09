-- Front-desk booking: let an admin book or cancel a class on behalf
-- of a client (phone bookings, walk-ins). Reuses the same capacity /
-- credit / ladies-only / 12h-cancellation rules clients get, rather
-- than duplicating that logic in a separate function.

-- book_class gains an optional p_client_id — the signature changes,
-- so the old single-arg version must be dropped first or Postgres
-- treats them as two separate overloads (ambiguous for 1-arg calls).
drop function if exists book_class(uuid);

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
    if not exists (select 1 from staff where user_id = v_actor_id and role = 'admin') then
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

grant execute on function book_class(uuid, uuid) to authenticated;

-- cancel_booking: same signature, but ownership check now also
-- accepts an admin acting on someone else's booking.
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
  v_is_late boolean;
begin
  select * into v_booking from bookings where id = p_booking_id;
  if not found then
    raise exception 'Booking not found';
  end if;

  select exists(select 1 from staff where user_id = v_actor_id and role = 'admin') into v_is_admin;
  if not (v_is_admin or v_booking.client_id = v_actor_id) then
    raise exception 'Not authorized';
  end if;

  if v_booking.status not in ('booked', 'waitlisted') then
    raise exception 'Booking already cancelled';
  end if;

  select co.date, c.time into v_occurrence
  from class_occurrences co join classes c on c.id = co.class_id
  where co.id = v_booking.occurrence_id;

  v_is_late := (v_occurrence.date + v_occurrence.time::time) - now() < interval '12 hours';

  if v_booking.status = 'booked' and not v_is_late then
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
      if v_promoted.credit_family = 'reformer' then
        if (select reformer_credits from clients where id = v_promoted.client_id) >= 1 then
          update clients set reformer_credits = reformer_credits - 1 where id = v_promoted.client_id;
          update bookings set status = 'booked' where id = v_promoted.id;
          exit;
        end if;
      else
        if (select mat_credits from clients where id = v_promoted.client_id) >= 1 then
          update clients set mat_credits = mat_credits - 1 where id = v_promoted.client_id;
          update bookings set status = 'booked' where id = v_promoted.id;
          exit;
        end if;
      end if;
    end loop;
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function cancel_booking(uuid) to authenticated;
