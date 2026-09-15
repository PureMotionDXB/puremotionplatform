-- Phase 1 of moving from a fixed two-family model (reformer/mat
-- hardcoded everywhere) to a flexible category system. This
-- migration is deliberately invisible to the app: every existing
-- column keeps its name (classes.family, bookings.credit_family,
-- client_memberships.family, credit_adjustments.family) — only their
-- constraint changes from a fixed CHECK to a foreign key against the
-- new service_categories table, seeded with the exact same two text
-- values ('reformer', 'mat') that already exist everywhere, so there
-- is zero data transformation and zero risk of misassigning a row.
--
-- The one real structural change is clients.reformer_credits /
-- mat_credits (two fixed columns) becoming client_credits (a real
-- per-category ledger). Phase 2 (a separate piece of work) is where
-- staff actually get a UI to add new categories, classes, and
-- pricing without a code deploy — this migration only lays the
-- foundation for that, with the current UI behaving identically.

create table if not exists service_categories (
  id text primary key,
  name text not null,
  color text,
  display_order int not null default 0,
  created_at timestamptz not null default now()
);
alter table service_categories enable row level security;

create policy "Public read categories" on service_categories for select using (true);
create policy "Admin write categories" on service_categories
  for all
  using (exists (select 1 from staff where staff.user_id = auth.uid() and staff.role in ('admin', 'owner')))
  with check (exists (select 1 from staff where staff.user_id = auth.uid() and staff.role in ('admin', 'owner')));

insert into service_categories (id, name, display_order) values
  ('reformer', 'Reformer', 0),
  ('mat', 'Mat', 1)
on conflict (id) do nothing;

-- ── client_credits: replaces clients.reformer_credits / mat_credits ──
create table if not exists client_credits (
  client_id uuid not null references clients(id) on delete cascade,
  family text not null references service_categories(id),
  credits int not null default 0,
  primary key (client_id, family)
);
alter table client_credits enable row level security;

create policy "Clients read own credits" on client_credits
  for select using (auth.uid() = client_id);
create policy "Admin read all credits" on client_credits
  for select
  using (exists (select 1 from staff where staff.user_id = auth.uid() and staff.role in ('admin', 'owner')));
-- No insert/update/delete policy for anyone — all writes go through
-- the SECURITY DEFINER functions below, same posture as the old
-- column-level lockdown in 005_lock_credit_columns.sql, just moved
-- from column grants to a dedicated table with no write policy at all.

insert into client_credits (client_id, family, credits)
select id, 'reformer', reformer_credits from clients
union all
select id, 'mat', mat_credits from clients;

-- ── Swap fixed CHECK constraints for FKs against service_categories ──
alter table classes drop constraint if exists classes_family_check;
alter table classes add constraint classes_family_fkey foreign key (family) references service_categories(id);

alter table bookings drop constraint if exists bookings_credit_family_check;
alter table bookings add constraint bookings_credit_family_fkey foreign key (credit_family) references service_categories(id);

alter table client_memberships drop constraint if exists client_memberships_family_check;
alter table client_memberships add constraint client_memberships_family_fkey foreign key (family) references service_categories(id);

alter table credit_adjustments drop constraint if exists credit_adjustments_family_check;
alter table credit_adjustments add constraint credit_adjustments_family_fkey foreign key (family) references service_categories(id);

-- ── Drop the now-replaced fixed columns ──
alter table clients drop column if exists reformer_credits;
alter table clients drop column if exists mat_credits;

-- ── Rewrite the 6 functions to use client_credits instead of the
-- fixed columns. External signatures are unchanged. ──

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
  if not exists (select 1 from service_categories where id = p_family) then
    raise exception 'Invalid credit family';
  end if;
  if p_delta = 0 then
    raise exception 'Delta cannot be zero';
  end if;

  insert into client_credits (client_id, family, credits)
  values (p_client_id, p_family, p_delta)
  on conflict (client_id, family) do update set credits = client_credits.credits + p_delta;

  insert into credit_adjustments (client_id, family, delta, reason, created_by)
  values (p_client_id, p_family, p_delta, p_reason, v_staff_id);

  return jsonb_build_object('ok', true);
end;
$$;

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
  v_credits int;
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
      select credits into v_credits from client_credits
        where client_id = v_client_id and family = v_occurrence.family;
      if coalesce(v_credits, 0) < 1 then
        raise exception 'Not enough % credits', initcap(v_occurrence.family);
      end if;
      update client_credits set credits = credits - 1
        where client_id = v_client_id and family = v_occurrence.family;
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
  v_promoted_credits int;
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
    insert into client_credits (client_id, family, credits)
    values (v_booking.client_id, v_booking.credit_family, 1)
    on conflict (client_id, family) do update set credits = client_credits.credits + 1;
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
      else
        select credits into v_promoted_credits from client_credits
          where client_id = v_promoted.client_id and family = v_promoted.credit_family;
        if coalesce(v_promoted_credits, 0) >= 1 then
          update client_credits set credits = credits - 1
            where client_id = v_promoted.client_id and family = v_promoted.credit_family;
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
  v_credits int;
  v_is_late boolean;
  v_booked_count int;
  v_waitlist_count int;
  v_new_status text;
  v_promoted record;
  v_promoted_booking_id uuid;
  v_promoted_has_membership boolean;
  v_promoted_credits int;
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
    insert into client_credits (client_id, family, credits)
    values (v_client_id, v_old_booking.credit_family, 1)
    on conflict (client_id, family) do update set credits = client_credits.credits + 1;
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
      else
        select credits into v_promoted_credits from client_credits
          where client_id = v_promoted.client_id and family = v_promoted.credit_family;
        if coalesce(v_promoted_credits, 0) >= 1 then
          update client_credits set credits = credits - 1
            where client_id = v_promoted.client_id and family = v_promoted.credit_family;
          update bookings set status = 'booked' where id = v_promoted.id;
          v_promoted_booking_id := v_promoted.id;
          exit;
        end if;
      end if;
    end loop;
  end if;

  select count(*) into v_booked_count from bookings
    where occurrence_id = p_new_occurrence_id and status = 'booked';
  select count(*) into v_waitlist_count from bookings
    where occurrence_id = p_new_occurrence_id and status = 'waitlisted';

  v_has_membership := has_active_membership(v_client_id, v_new_occurrence.family, v_new_occurrence.date);

  if v_booked_count < v_new_occurrence.capacity then
    if not v_has_membership then
      select credits into v_credits from client_credits
        where client_id = v_client_id and family = v_new_occurrence.family;
      if coalesce(v_credits, 0) < 1 then
        raise exception 'Not enough % credits for the new class', initcap(v_new_occurrence.family);
      end if;
      update client_credits set credits = credits - 1
        where client_id = v_client_id and family = v_new_occurrence.family;
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
  if not exists (select 1 from service_categories where id = p_family) then
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

-- has_active_membership needs no change — it already just compares
-- p_family as a plain text value against client_memberships.family,
-- which still works unchanged now that the column is FK'd instead of
-- CHECK-constrained. Included here only as a no-op create-or-replace
-- so this migration file is a complete, self-contained record of
-- every function touched.
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
