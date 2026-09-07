-- RLS controls which ROWS a client can touch, not which COLUMNS.
-- The "Clients update own row" policy from migration 004 technically
-- let a client set their own reformer_credits/mat_credits directly via
-- a normal update() call. Column-level grants close that: clients (and
-- staff, both of which are the "authenticated" Postgres role) can only
-- ever change name/phone/gender directly. Credits can only change
-- through book_class()/cancel_booking() (security definer, so they
-- bypass these grants entirely) or a future staff-only credit function.
revoke insert, update on clients from authenticated;
grant insert (id, full_name, phone, gender) on clients to authenticated;
grant update (full_name, phone, gender) on clients to authenticated;
