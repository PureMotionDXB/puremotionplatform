-- Three real permission tiers instead of two: owner (everything,
-- including Reports), admin (everything Owner has except Reports —
-- schedule, roster, booking for clients, credits, fees, client
-- directory), instructor (their own schedule only, unchanged).
--
-- Every place that used to check role = 'admin' now checks
-- role in ('admin', 'owner'), so existing Admin accounts keep every
-- permission they already have. Reports access is gated in the
-- frontend only (see admin/reports/page.tsx and admin/layout.tsx) —
-- there's no separate row-level secret behind it: Reports is an
-- aggregation of the same bookings data Admin already has legitimate
-- RLS access to for roster/booking/client work, so hiding it is a
-- workflow simplification, not a data-secrecy boundary.

alter table staff drop constraint if exists staff_role_check;
alter table staff add constraint staff_role_check
  check (role in ('owner', 'admin', 'instructor'));

update staff set role = 'owner' where user_id in (
  select id from auth.users where email = 'info@puremotion.ae'
);

-- ── instructors / classes (migration 009) ──────────────────────────
drop policy if exists "Admin write instructors" on instructors;
create policy "Admin write instructors" on instructors
  for all
  using (exists (select 1 from staff where staff.user_id = auth.uid() and staff.role in ('admin', 'owner')))
  with check (exists (select 1 from staff where staff.user_id = auth.uid() and staff.role in ('admin', 'owner')));

drop policy if exists "Admin write classes" on classes;
create policy "Admin write classes" on classes
  for all
  using (exists (select 1 from staff where staff.user_id = auth.uid() and staff.role in ('admin', 'owner')))
  with check (exists (select 1 from staff where staff.user_id = auth.uid() and staff.role in ('admin', 'owner')));

-- ── bookings / clients (migration 009) ──────────────────────────────
drop policy if exists "Admin read all bookings" on bookings;
create policy "Admin read all bookings" on bookings
  for select
  using (exists (select 1 from staff where staff.user_id = auth.uid() and staff.role in ('admin', 'owner')));

drop policy if exists "Admin read all clients" on clients;
create policy "Admin read all clients" on clients
  for select
  using (exists (select 1 from staff where staff.user_id = auth.uid() and staff.role in ('admin', 'owner')));

drop policy if exists "Admin update all clients" on clients;
create policy "Admin update all clients" on clients
  for update
  using (exists (select 1 from staff where staff.user_id = auth.uid() and staff.role in ('admin', 'owner')))
  with check (exists (select 1 from staff where staff.user_id = auth.uid() and staff.role in ('admin', 'owner')));

-- ── credit adjustments (migration 009) ──────────────────────────────
drop policy if exists "Admin read adjustments" on credit_adjustments;
create policy "Admin read adjustments" on credit_adjustments
  for select
  using (exists (select 1 from staff where staff.user_id = auth.uid() and staff.role in ('admin', 'owner')));

create or replace function adjust_credits(
  p_client_id uuid,
  p_family text,
  p_delta int,
  p_reason text default null
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
    raise exception 'Invalid credit family';
  end if;
  if p_delta = 0 then
    raise exception 'Delta cannot be zero';
  end if;

  if p_family = 'reformer' then
    update clients set reformer_credits = reformer_credits + p_delta where id = p_client_id;
  else
    update clients set mat_credits = mat_credits + p_delta where id = p_client_id;
  end if;

  insert into credit_adjustments (client_id, family, delta, reason, created_by)
  values (p_client_id, p_family, p_delta, p_reason, v_staff_id);

  return jsonb_build_object('ok', true);
end;
$$;

-- ── attendance (migration 010) ──────────────────────────────────────
create or replace function set_attendance(p_booking_id uuid, p_attended boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff_id uuid := auth.uid();
  v_booking record;
  v_is_admin boolean;
  v_is_own_instructor boolean;
begin
  select * into v_booking from bookings where id = p_booking_id;
  if not found then
    raise exception 'Booking not found';
  end if;

  select exists(
    select 1 from staff where user_id = v_staff_id and role in ('admin', 'owner')
  ) into v_is_admin;

  select exists(
    select 1
    from class_occurrences co
    join classes c on c.id = co.class_id
    join staff s on s.instructor_id = c.instructor_id
    where co.id = v_booking.occurrence_id
      and s.user_id = v_staff_id
      and s.role = 'instructor'
  ) into v_is_own_instructor;

  if not (v_is_admin or v_is_own_instructor) then
    raise exception 'Not authorized';
  end if;

  if v_booking.status not in ('booked', 'attended') then
    raise exception 'Only booked clients can be checked in';
  end if;

  update bookings
    set status = case when p_attended then 'attended' else 'booked' end
  where id = p_booking_id;

  return jsonb_build_object('ok', true);
end;
$$;

-- ── no-show fees (migration 011) ────────────────────────────────────
drop policy if exists "Admin read fees" on no_show_fees;
create policy "Admin read fees" on no_show_fees for select
  using (exists (select 1 from staff where staff.user_id = auth.uid() and staff.role in ('admin', 'owner')));

create or replace function mark_no_show(p_booking_id uuid, p_amount_aed numeric default 40)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff_id uuid := auth.uid();
  v_booking record;
  v_is_admin boolean;
  v_is_own_instructor boolean;
begin
  select * into v_booking from bookings where id = p_booking_id;
  if not found then
    raise exception 'Booking not found';
  end if;

  select exists(select 1 from staff where user_id = v_staff_id and role in ('admin', 'owner')) into v_is_admin;
  select exists(
    select 1
    from class_occurrences co
    join classes c on c.id = co.class_id
    join staff s on s.instructor_id = c.instructor_id
    where co.id = v_booking.occurrence_id
      and s.user_id = v_staff_id
      and s.role = 'instructor'
  ) into v_is_own_instructor;

  if not (v_is_admin or v_is_own_instructor) then
    raise exception 'Not authorized';
  end if;
  if v_booking.status <> 'booked' then
    raise exception 'Only booked clients can be marked no-show';
  end if;

  update bookings set status = 'no_show' where id = p_booking_id;
  insert into no_show_fees (booking_id, client_id, reason, amount_aed)
  values (p_booking_id, v_booking.client_id, 'no_show', p_amount_aed);

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function undo_no_show(p_booking_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff_id uuid := auth.uid();
  v_booking record;
  v_is_admin boolean;
  v_is_own_instructor boolean;
begin
  select * into v_booking from bookings where id = p_booking_id;
  if not found then
    raise exception 'Booking not found';
  end if;

  select exists(select 1 from staff where user_id = v_staff_id and role in ('admin', 'owner')) into v_is_admin;
  select exists(
    select 1
    from class_occurrences co
    join classes c on c.id = co.class_id
    join staff s on s.instructor_id = c.instructor_id
    where co.id = v_booking.occurrence_id
      and s.user_id = v_staff_id
      and s.role = 'instructor'
  ) into v_is_own_instructor;

  if not (v_is_admin or v_is_own_instructor) then
    raise exception 'Not authorized';
  end if;
  if v_booking.status <> 'no_show' then
    raise exception 'Booking is not marked no-show';
  end if;

  update bookings set status = 'booked' where id = p_booking_id;
  delete from no_show_fees
    where booking_id = p_booking_id and reason = 'no_show' and collected = false and waived = false;

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function resolve_fee(p_fee_id uuid, p_collected boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff_id uuid := auth.uid();
begin
  if not exists (select 1 from staff where user_id = v_staff_id and role in ('admin', 'owner')) then
    raise exception 'Not authorized';
  end if;
  update no_show_fees
    set collected = p_collected, waived = not p_collected, resolved_at = now(), resolved_by = v_staff_id
  where id = p_fee_id;
  return jsonb_build_object('ok', true);
end;
$$;

-- ── front-desk booking (migration 012) ──────────────────────────────
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

  select exists(select 1 from staff where user_id = v_actor_id and role in ('admin', 'owner')) into v_is_admin;
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
