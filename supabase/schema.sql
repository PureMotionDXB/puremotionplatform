-- Instructors
create table if not exists instructors (
  id text primary key,
  name text not null
);

-- Classes
create table if not exists classes (
  id uuid primary key default gen_random_uuid(),
  day int not null check (day between 0 and 6),
  time text not null,
  name text not null,
  family text not null check (family in ('reformer', 'mat')),
  credit_cost int not null default 1,
  instructor_id text references instructors(id),
  capacity int not null default 10,
  booked int not null default 0,
  created_at timestamptz default now()
);

alter table instructors enable row level security;
alter table classes enable row level security;

-- TEMPORARY — open read/write until real staff login exists.
-- Anyone with the publishable key can currently read AND write these
-- tables. Replace with policies scoped to authenticated staff before
-- this goes live with real clients.
create policy "Public read instructors" on instructors for select using (true);
create policy "Public write instructors" on instructors for all using (true) with check (true);

create policy "Public read classes" on classes for select using (true);
create policy "Public write classes" on classes for all using (true) with check (true);
