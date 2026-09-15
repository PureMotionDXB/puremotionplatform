-- Fixes a live-payments bug: the Stripe webhook's credit-granting
-- code still reads/writes clients.reformer_credits/mat_credits,
-- columns that 021_service_categories.sql already dropped in favor
-- of the client_credits ledger. A completed real payment would
-- currently fail to grant credits (column no longer exists).
--
-- The webhook runs with the service-role key and has no signed-in
-- user session, so it can't call adjust_credits() — that function
-- requires the caller to be staff (raises "Not authorized"
-- otherwise). Same pattern as book_class_for_client (022): a
-- standalone service-role-only twin, leaving the tested,
-- staff-gated adjust_credits() untouched.

create or replace function grant_credits_for_client(
  p_client_id uuid,
  p_family text,
  p_amount int,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'Not authorized';
  end if;
  if not exists (select 1 from service_categories where id = p_family) then
    raise exception 'Invalid credit family';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be positive';
  end if;

  insert into client_credits (client_id, family, credits)
  values (p_client_id, p_family, p_amount)
  on conflict (client_id, family) do update set credits = client_credits.credits + p_amount;

  insert into credit_adjustments (client_id, family, delta, reason, created_by)
  values (p_client_id, p_family, p_amount, p_reason, p_client_id);

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function grant_credits_for_client(uuid, text, int, text) from public, anon, authenticated;
grant execute on function grant_credits_for_client(uuid, text, int, text) to service_role;
