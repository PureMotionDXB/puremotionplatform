-- Check-in / attendance tracking. bookings.status already allowed
-- 'attended' (migration 004) but nothing ever set it. This lets staff
-- (admin, or the instructor teaching that class) mark a booked client
-- as attended, and undo it.
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
    select 1 from staff where user_id = v_staff_id and role = 'admin'
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

grant execute on function set_attendance(uuid, boolean) to authenticated;
