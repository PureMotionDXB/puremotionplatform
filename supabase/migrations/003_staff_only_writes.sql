-- Replaces the temporary "anyone can write" policies with real ones:
-- reads stay public (clients need to browse the schedule without
-- logging in), but writes now require a signed-in staff account.
drop policy if exists "Public write instructors" on instructors;
drop policy if exists "Public write classes" on classes;

create policy "Staff write instructors" on instructors
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "Staff write classes" on classes
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
