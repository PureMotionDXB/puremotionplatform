-- No-show / late-cancellation fees. This system runs on credits, not
-- live card charges (that still needs Stripe), so this builds the
-- real buildable part: marking a no-show, auto-recording the AED 40
-- fee your waiver already promises for late cancellations, and a
-- place for staff to see and resolve what's owed (collected in cash,
-- or waived).
alter table bookings drop constraint if exists bookings_status_check;
alter table bookings add constraint bookings_status_check
  check (status in ('booked', 'waitlisted', 'cancelled', 'attended', 'no_show'));

create table if not exists no_show_fees (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  reason text not null check (reason in ('no_show', 'late_cancel')),
  amount_aed numeric(10, 2) not null default 40,
  collected boolean not null default false,
  waived boolean not null default false,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id)
);
alter table no_show_fees enable row level security;

create policy "Admin read fees" on no_show_fees for select
  using (exists (select 1 from staff where staff.user_id = auth.uid() and staff.role = 'admin'));
create policy "Clients read own fees" on no_show_fees for select
  using (auth.uid() = client_id);
-- No direct write policy — all writes go through the functions below.

-- ── Mark / undo a no-show (admin, or the instructor teaching that class) ──
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

  select exists(select 1 from staff where user_id = v_staff_id and role = 'admin') into v_is_admin;
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
grant execute on function mark_no_show(uuid, numeric) to authenticated;

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

  select exists(select 1 from staff where user_id = v_staff_id and role = 'admin') into v_is_admin;
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
grant execute on function undo_no_show(uuid) to authenticated;

-- ── Resolve a fee: mark collected (cash/card at the desk) or waived ──
create or replace function resolve_fee(p_fee_id uuid, p_collected boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff_id uuid := auth.uid();
begin
  if not exists (select 1 from staff where user_id = v_staff_id and role = 'admin') then
    raise exception 'Not authorized';
  end if;
  update no_show_fees
    set collected = p_collected, waived = not p_collected, resolved_at = now(), resolved_by = v_staff_id
  where id = p_fee_id;
  return jsonb_build_object('ok', true);
end;
$$;
grant execute on function resolve_fee(uuid, boolean) to authenticated;

-- ── cancel_booking: also record a late-cancel fee when inside 12h ──
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
  v_is_late boolean;
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

  v_is_late := (v_occurrence.date + v_occurrence.time::time) - now() < interval '12 hours';

  if v_booking.status = 'booked' and not v_is_late then
    if v_booking.credit_family = 'reformer' then
      update clients set reformer_credits = reformer_credits + 1 where id = v_client_id;
    else
      update clients set mat_credits = mat_credits + 1 where id = v_client_id;
    end if;
  end if;

  if v_booking.status = 'booked' and v_is_late then
    insert into no_show_fees (booking_id, client_id, reason)
    values (p_booking_id, v_client_id, 'late_cancel');
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
