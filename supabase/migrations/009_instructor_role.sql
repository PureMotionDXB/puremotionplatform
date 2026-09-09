-- Two real permission tiers within "staff": admin (full access) and
-- instructor (their own classes/roster only, no schedule editing).
alter table staff add column if not exists role text not null default 'admin' check (role in ('admin', 'instructor'));
alter table staff add column if not exists instructor_id text references instructors(id);

-- Schedule/instructor editing is admin-only now.
drop policy if exists "Staff write instructors" on instructors;
drop policy if exists "Staff write classes" on classes;

create policy "Admin write instructors" on instructors
  for all
  using (exists (select 1 from staff where staff.user_id = auth.uid() and staff.role = 'admin'))
  with check (exists (select 1 from staff where staff.user_id = auth.uid() and staff.role = 'admin'));

create policy "Admin write classes" on classes
  for all
  using (exists (select 1 from staff where staff.user_id = auth.uid() and staff.role = 'admin'))
  with check (exists (select 1 from staff where staff.user_id = auth.uid() and staff.role = 'admin'));

-- Bookings: admins see everything; instructors see only their own classes'.
drop policy if exists "Staff read all bookings" on bookings;

create policy "Admin read all bookings" on bookings
  for select
  using (exists (select 1 from staff where staff.user_id = auth.uid() and staff.role = 'admin'));

create policy "Instructors read own class bookings" on bookings
  for select
  using (
    exists (
      select 1
      from class_occurrences co
      join classes c on c.id = co.class_id
      join staff s on s.instructor_id = c.instructor_id
      where co.id = bookings.occurrence_id
        and s.user_id = auth.uid()
        and s.role = 'instructor'
    )
  );

-- Clients: admins see everything; instructors see only clients booked
-- into one of their own classes (not the full directory).
drop policy if exists "Staff read all clients" on clients;
drop policy if exists "Staff update all clients" on clients;

create policy "Admin read all clients" on clients
  for select
  using (exists (select 1 from staff where staff.user_id = auth.uid() and staff.role = 'admin'));

create policy "Admin update all clients" on clients
  for update
  using (exists (select 1 from staff where staff.user_id = auth.uid() and staff.role = 'admin'))
  with check (exists (select 1 from staff where staff.user_id = auth.uid() and staff.role = 'admin'));

create policy "Instructors read their students" on clients
  for select
  using (
    exists (
      select 1
      from bookings b
      join class_occurrences co on co.id = b.occurrence_id
      join classes c on c.id = co.class_id
      join staff s on s.instructor_id = c.instructor_id
      where b.client_id = clients.id
        and s.user_id = auth.uid()
        and s.role = 'instructor'
    )
  );

-- Credit adjustments and the ability to adjust credits stay admin-only.
drop policy if exists "Staff read adjustments" on credit_adjustments;
create policy "Admin read adjustments" on credit_adjustments
  for select
  using (exists (select 1 from staff where staff.user_id = auth.uid() and staff.role = 'admin'));

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
  if not exists (select 1 from staff where staff.user_id = v_staff_id and staff.role = 'admin') then
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
