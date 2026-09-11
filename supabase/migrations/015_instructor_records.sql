-- Private instructor HR records: first/last name, date of birth,
-- email, and uploaded documents (freelancer contracts, IDs). This is
-- deliberately a SEPARATE table from `instructors` — that table is
-- publicly readable (clients see instructor names/bios on the
-- schedule and class detail pages), and none of this belongs there.
-- Admin/owner only, never instructor or client.

create table if not exists instructor_records (
  instructor_id text primary key references instructors(id) on delete cascade,
  first_name text,
  last_name text,
  date_of_birth date,
  email text,
  updated_at timestamptz not null default now()
);
alter table instructor_records enable row level security;

create policy "Admin manage instructor records" on instructor_records
  for all
  using (exists (select 1 from staff where staff.user_id = auth.uid() and staff.role in ('admin', 'owner')))
  with check (exists (select 1 from staff where staff.user_id = auth.uid() and staff.role in ('admin', 'owner')));

create table if not exists instructor_documents (
  id uuid primary key default gen_random_uuid(),
  instructor_id text not null references instructors(id) on delete cascade,
  label text not null,
  storage_path text not null,
  uploaded_at timestamptz not null default now(),
  uploaded_by uuid references auth.users(id)
);
alter table instructor_documents enable row level security;

create policy "Admin manage instructor documents" on instructor_documents
  for all
  using (exists (select 1 from staff where staff.user_id = auth.uid() and staff.role in ('admin', 'owner')))
  with check (exists (select 1 from staff where staff.user_id = auth.uid() and staff.role in ('admin', 'owner')));

-- Private storage bucket for the actual files (contracts, ID scans).
-- public = false: nothing is readable without a signed URL, issued
-- only through the storage policies below.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'instructor-documents',
  'instructor-documents',
  false,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/heic']
)
on conflict (id) do nothing;

create policy "Admin read instructor documents" on storage.objects
  for select
  using (
    bucket_id = 'instructor-documents'
    and exists (select 1 from staff where staff.user_id = auth.uid() and staff.role in ('admin', 'owner'))
  );

create policy "Admin upload instructor documents" on storage.objects
  for insert
  with check (
    bucket_id = 'instructor-documents'
    and exists (select 1 from staff where staff.user_id = auth.uid() and staff.role in ('admin', 'owner'))
  );

create policy "Admin delete instructor documents" on storage.objects
  for delete
  using (
    bucket_id = 'instructor-documents'
    and exists (select 1 from staff where staff.user_id = auth.uid() and staff.role in ('admin', 'owner'))
  );
