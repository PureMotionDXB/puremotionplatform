-- Supports the "pay for this exact class and get booked instantly"
-- flow on /schedule: a client with no credits/membership for a class
-- can now pay for a single credit at checkout time, and on payment
-- success the Stripe webhook books them into that specific occurrence
-- automatically (no separate trip back to the schedule needed).
--
-- The webhook runs with the service-role key and has no signed-in
-- user session, so it can't call book_class() — that function
-- requires auth.uid() to be set (raises "Not signed in" otherwise).
-- This adds a standalone twin scoped to service-role callers only,
-- so the existing, already-verified book_class/cancel_booking/
-- reschedule_booking are left completely untouched.

create or replace function book_class_for_client(p_client_id uuid, p_occurrence_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_occurrence record;
  v_client record;
  v_credits int;
  v_booked_count int;
  v_waitlist_count int;
  v_new_status text;
  v_has_membership boolean;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Not authorized';
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

  select * into v_client from clients where id = p_client_id;
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
    where occurrence_id = p_occurrence_id and client_id = p_client_id and status in ('booked', 'waitlisted')
  ) then
    raise exception 'This client already has a spot in this class';
  end if;

  select count(*) into v_booked_count from bookings
    where occurrence_id = p_occurrence_id and status = 'booked';
  select count(*) into v_waitlist_count from bookings
    where occurrence_id = p_occurrence_id and status = 'waitlisted';

  v_has_membership := has_active_membership(p_client_id, v_occurrence.family, v_occurrence.date);

  if v_booked_count < v_occurrence.capacity then
    if not v_has_membership then
      select credits into v_credits from client_credits
        where client_id = p_client_id and family = v_occurrence.family;
      if coalesce(v_credits, 0) < 1 then
        raise exception 'Not enough % credits', initcap(v_occurrence.family);
      end if;
      update client_credits set credits = credits - 1
        where client_id = p_client_id and family = v_occurrence.family;
    end if;
    v_new_status := 'booked';
  elsif v_waitlist_count < 2 then
    v_new_status := 'waitlisted';
  else
    raise exception 'Class and waitlist are full';
  end if;

  insert into bookings (occurrence_id, client_id, status, credit_family, via_membership)
  values (p_occurrence_id, p_client_id, v_new_status, v_occurrence.family, v_has_membership and v_new_status = 'booked');

  return jsonb_build_object('status', v_new_status);
end;
$$;

revoke all on function book_class_for_client(uuid, uuid) from public, anon, authenticated;
grant execute on function book_class_for_client(uuid, uuid) to service_role;
