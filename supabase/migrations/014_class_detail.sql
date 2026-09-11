-- Class detail page: a short description per class, and a short bio
-- per instructor. Both are plain text, editable by admin/owner via
-- the existing classes/instructors write policies (no new RLS needed
-- — these are just new columns on tables that are already publicly
-- readable and admin/owner writable).
alter table classes add column if not exists description text;
alter table instructors add column if not exists bio text;
