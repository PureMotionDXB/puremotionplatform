-- Report whether a check-in was a client's first-ever attended class,
-- so the app can trigger a "thanks for your first class — here's
-- what's next" email. Checked BEFORE the update, against the
-- client's whole attendance history (not just this booking), so it's
-- correct regardless of which staff member or instructor checks them
-- in.
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
  v_is_first boolean := false;
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

  if p_attended and v_booking.status = 'booked' then
    select not exists(
      select 1 from bookings where client_id = v_booking.client_id and status = 'attended'
    ) into v_is_first;
  end if;

  update bookings
    set status = case when p_attended then 'attended' else 'booked' end
  where id = p_booking_id;

  return jsonb_build_object(
    'ok', true,
    'first_attendance', v_is_first,
    'client_id', v_booking.client_id
  );
end;
$$;
