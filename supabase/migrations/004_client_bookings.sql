-- Client accounts, dated class occurrences, and real bookings.
-- Run this whole file once in Supabase SQL Editor.

-- ── Staff membership ─────────────────────────────────────────────
-- Distinguishes staff accounts from client accounts for RLS, now that
-- clients also get real Supabase Auth logins. Without this, any
-- signed-in client would satisfy the old "authenticated" check used
-- for schedule-editing policies.
create table if not exists staff (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table staff enable row level security;
create policy "Staff can read staff table" on staff for select using (auth.uid() = user_id);

insert into staff (user_id)
select id from auth.users where email = 'info@puremotion.ae'
on conflict (user_id) do nothing;

drop policy if exists "Staff write instructors" on instructors;
drop policy if exists "Staff write classes" on classes;

create policy "Staff write instructors" on instructors
  for all
  using (exists (select 1 from staff where staff.user_id = auth.uid()))
  with check (exists (select 1 from staff where staff.user_id = auth.uid()));

create policy "Staff write classes" on classes
  for all
  using (exists (select 1 from staff where staff.user_id = auth.uid()))
  with check (exists (select 1 from staff where staff.user_id = auth.uid()));

-- ── Clients ───────────────────────────────────────────────────────
create table if not exists clients (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text,
  gender text not null default 'unspecified' check (gender in ('female', 'male', 'unspecified')),
  reformer_credits int not null default 0,
  mat_credits int not null default 0,
  created_at timestamptz not null default now()
);
alter table clients enable row level security;

create policy "Clients read own row" on clients for select using (auth.uid() = id);
create policy "Clients insert own row" on clients for insert with check (auth.uid() = id);
create policy "Clients update own row" on clients for update
  using (auth.uid() = id) with check (auth.uid() = id);
create policy "Staff read all clients" on clients for select
  using (exists (select 1 from staff where staff.user_id = auth.uid()));
create policy "Staff update all clients" on clients for update
  using (exists (select 1 from staff where staff.user_id = auth.uid()))
  with check (exists (select 1 from staff where staff.user_id = auth.uid()));

-- ── Class occurrences (dated instances of a weekly template) ────────
create table if not exists class_occurrences (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  date date not null,
  created_at timestamptz not null default now(),
  unique (class_id, date)
);
alter table class_occurrences enable row level security;
create policy "Public read occurrences" on class_occurrences for select using (true);
-- Writes only happen through generate_occurrences() below (security definer).

-- ── Bookings ──────────────────────────────────────────────────────
create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  occurrence_id uuid not null references class_occurrences(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  status text not null default 'booked' check (status in ('booked', 'waitlisted', 'cancelled', 'attended')),
  credit_family text not null check (credit_family in ('reformer', 'mat')),
  created_at timestamptz not null default now(),
  cancelled_at timestamptz
);
alter table bookings enable row level security;
create policy "Clients read own bookings" on bookings for select using (auth.uid() = client_id);
create policy "Staff read all bookings" on bookings for select
  using (exists (select 1 from staff where staff.user_id = auth.uid()));
-- No direct insert/update policy — all writes go through book_class() /
-- cancel_booking() below so capacity and credit checks stay atomic.

-- ── Generate upcoming dated occurrences from the weekly templates ──
create or replace function generate_occurrences(weeks_ahead int default 3)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  d date;
begin
  for d in
    select generate_series(current_date, current_date + (weeks_ahead * 7), interval '1 day')::date
  loop
    -- classes.day is 0=Mon..6=Sun; Postgres extract(dow) is 0=Sun..6=Sat.
    insert into class_occurrences (class_id, date)
    select c.id, d
    from classes c
    where c.day = (extract(dow from d)::int + 6) % 7
    on conflict (class_id, date) do nothing;
  end loop;
end;
$$;

grant execute on function generate_occurrences(int) to anon, authenticated;

-- ── Book a class (atomic: capacity + credit checks + deduction) ───
create or replace function book_class(p_occurrence_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client_id uuid := auth.uid();
  v_occurrence record;
  v_client record;
  v_booked_count int;
  v_waitlist_count int;
  v_new_status text;
begin
  if v_client_id is null then
    raise exception 'Not signed in';
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
    raise exception 'You already have a spot in this class';
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

grant execute on function book_class(uuid) to authenticated;

-- ── Cancel a booking (refund if outside 12h, promote first waitlister) ──
create or replace function cancel_booking(p_booking_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client_id uuid := auth.uid();
  v_booking record;
  v_occurrence record;
  v_promoted record;
begin
  select * into v_booking from bookings where id = p_booking_id and client_id = v_client_id;
  if not found then
    raise exception 'Booking not found';
  end if;
  if v_booking.status not in ('booked', 'waitlisted') then
    raise exception 'Booking already cancelled';
  end if;

  select co.date, c.time into v_occurrence
  from class_occurrences co join classes c on c.id = co.class_id
  where co.id = v_booking.occurrence_id;

  if v_booking.status = 'booked'
    and (v_occurrence.date + v_occurrence.time::time) - now() >= interval '12 hours'
  then
    if v_booking.credit_family = 'reformer' then
      update clients set reformer_credits = reformer_credits + 1 where id = v_client_id;
    else
      update clients set mat_credits = mat_credits + 1 where id = v_client_id;
    end if;
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
