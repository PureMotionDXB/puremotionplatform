-- Real sellable packages (credit packs, memberships), previously a
-- hardcoded TypeScript array (stripe-catalog.ts). This table lets
-- staff create/edit packages from the admin backend, with Stripe
-- products/prices auto-provisioned by the app server-side. `id` is
-- the new canonical identifier used in Stripe Checkout metadata,
-- replacing the old string PackageKey.

create table if not exists packages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  family text not null references service_categories(id),
  kind text not null check (kind in ('credits', 'membership')),
  credit_amount int check (credit_amount > 0),
  duration_days int check (duration_days > 0),
  duration_months int check (duration_months > 0),
  price_aed numeric(10,2) not null check (price_aed >= 0),
  stripe_product_id text not null,
  stripe_price_id text not null,
  display_tab text not null check (display_tab in ('starter', 'credit', 'membership')),
  display_order int not null default 0,
  detail text,
  note text,
  single_class boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  constraint packages_kind_fields check (
    (kind = 'credits' and credit_amount is not null and duration_days is null and duration_months is null)
    or
    (kind = 'membership' and credit_amount is null
      and ((duration_days is not null) <> (duration_months is not null)))
  ),
  constraint packages_single_class_is_one_credit check (
    not single_class or (kind = 'credits' and credit_amount = 1)
  )
);

-- At most one active "pay for this exact class" package per family —
-- used by the /schedule pay-and-book flow to find the right price.
create unique index if not exists packages_single_class_per_family
  on packages (family) where (single_class and active);

alter table packages enable row level security;

create policy "Public read active packages" on packages
  for select using (active = true);

create policy "Staff read all packages" on packages
  for select
  using (exists (select 1 from staff where staff.user_id = auth.uid() and staff.role in ('admin', 'owner')));

create policy "Admin write packages" on packages
  for all
  using (exists (select 1 from staff where staff.user_id = auth.uid() and staff.role in ('admin', 'owner')))
  with check (exists (select 1 from staff where staff.user_id = auth.uid() and staff.role in ('admin', 'owner')));
