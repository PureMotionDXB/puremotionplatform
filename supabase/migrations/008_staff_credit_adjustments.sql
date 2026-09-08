-- Lets staff manually adjust a client's credit balance (e.g. cash
-- payment at the desk, a goodwill top-up, a correction) with a real
-- audit trail — who changed it, by how much, and why.
create table if not exists credit_adjustments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  family text not null check (family in ('reformer', 'mat')),
  delta int not null,
  reason text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
alter table credit_adjustments enable row level security;

create policy "Staff read adjustments" on credit_adjustments for select
  using (exists (select 1 from staff where staff.user_id = auth.uid()));
-- No direct insert policy — all writes go through adjust_credits()
-- below, which checks staff membership itself.

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
  if not exists (select 1 from staff where staff.user_id = v_staff_id) then
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

grant execute on function adjust_credits(uuid, text, int, text) to authenticated;
