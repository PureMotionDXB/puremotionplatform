-- Migration 005 locked clients' insertable columns down to
-- (id, full_name, phone, gender). Signup now also collects
-- date_of_birth and liability_accepted_at, so the insert grant needs
-- those two added — but NOT the update grant, since a client shouldn't
-- be able to retroactively change their birthdate or un-accept a
-- waiver they already signed.
revoke insert on clients from authenticated;
grant insert (id, full_name, phone, gender, date_of_birth, liability_accepted_at)
  on clients to authenticated;
