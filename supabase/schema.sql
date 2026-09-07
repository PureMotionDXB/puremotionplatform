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
  ladies_only boolean not null default false,
  credit_cost int not null default 1,
  instructor_id text references instructors(id),
  capacity int not null default 10,
  booked int not null default 0,
  created_at timestamptz default now()
);

alter table instructors enable row level security;
alter table classes enable row level security;

-- Reads are public (clients browse the schedule without logging in).
-- Writes require a signed-in staff account (see src/proxy.ts and
-- src/app/admin/login).
create policy "Public read instructors" on instructors for select using (true);
create policy "Staff write instructors" on instructors for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "Public read classes" on classes for select using (true);
create policy "Staff write classes" on classes for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
