import { supabase } from "./supabase";
import type { DisplayTab, Package, PackageKind } from "./packages-data";

interface PackageRow {
  id: string;
  name: string;
  family: string;
  kind: PackageKind;
  credit_amount: number | null;
  duration_days: number | null;
  duration_months: number | null;
  price_aed: number;
  stripe_product_id: string;
  stripe_price_id: string;
  display_tab: DisplayTab;
  display_order: number;
  detail: string | null;
  note: string | null;
  single_class: boolean;
  active: boolean;
}

function fromRow(row: PackageRow): Package {
  return {
    id: row.id,
    name: row.name,
    family: row.family,
    kind: row.kind,
    creditAmount: row.credit_amount,
    durationDays: row.duration_days,
    durationMonths: row.duration_months,
    priceAed: row.price_aed,
    stripeProductId: row.stripe_product_id,
    stripePriceId: row.stripe_price_id,
    displayTab: row.display_tab,
    displayOrder: row.display_order,
    detail: row.detail,
    note: row.note,
    singleClass: row.single_class,
    active: row.active,
  };
}

export async function fetchActivePackages(): Promise<Package[]> {
  const { data, error } = await supabase
    .from("packages")
    .select("*")
    .eq("active", true)
    .order("display_order");
  if (error) throw error;
  return (data as PackageRow[]).map(fromRow);
}

// Includes archived packages — for the admin screen only, gated by
// the "Staff read all packages" RLS policy.
export async function fetchAllPackages(): Promise<Package[]> {
  const { data, error } = await supabase.from("packages").select("*").order("display_order");
  if (error) throw error;
  return (data as PackageRow[]).map(fromRow);
}

// Public — used by /schedule's "pay for this exact class" flow to
// price the button per category.
export async function fetchSingleClassPrices(): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from("packages")
    .select("family, price_aed")
    .eq("single_class", true)
    .eq("active", true);
  if (error) throw error;
  const rows = (data ?? []) as { family: string; price_aed: number }[];
  return Object.fromEntries(rows.map((r) => [r.family, r.price_aed]));
}

export interface CreatePackageInput {
  name: string;
  family: string;
  kind: PackageKind;
  creditAmount?: number | null;
  durationDays?: number | null;
  durationMonths?: number | null;
  priceAed: number;
  displayTab: DisplayTab;
  displayOrder?: number;
  detail?: string | null;
  note?: string | null;
  singleClass?: boolean;
}

export async function createPackage(input: CreatePackageInput): Promise<Package> {
  const res = await fetch("/api/admin/packages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Failed to create package");
  return fromRow(data as PackageRow);
}

export interface UpdatePackageInput {
  name?: string;
  family?: string;
  displayTab?: DisplayTab;
  displayOrder?: number;
  detail?: string | null;
  note?: string | null;
  singleClass?: boolean;
  active?: boolean;
}

export async function updatePackage(id: string, input: UpdatePackageInput): Promise<Package> {
  const res = await fetch(`/api/admin/packages/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Failed to update package");
  return fromRow(data as PackageRow);
}

export async function changePackagePrice(id: string, priceAed: number): Promise<Package> {
  const res = await fetch(`/api/admin/packages/${id}/price`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ priceAed }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Failed to update price");
  return fromRow(data as PackageRow);
}
