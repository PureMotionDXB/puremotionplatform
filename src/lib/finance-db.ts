import { supabase } from "./supabase";

// This studio runs on a credit economy with no live payment
// integration yet (Stripe isn't wired up) — there's no price-per-
// credit stored anywhere in the schema, so there's no honest way to
// compute "revenue" from bookings or credit adjustments. What's real
// AED here is the no-show/late-cancellation fee ledger. Credit
// adjustments are shown as their own activity log (credits granted
// vs removed), not converted into a fabricated currency figure.

export interface FeeReasonBreakdown {
  reason: "no_show" | "late_cancel";
  count: number;
  amountAed: number;
}

export interface FeeSummary {
  issuedCount: number;
  issuedAed: number;
  collectedCount: number;
  collectedAed: number;
  waivedCount: number;
  waivedAed: number;
  byReason: FeeReasonBreakdown[];
}

interface FeeRow {
  reason: "no_show" | "late_cancel";
  amount_aed: number;
  collected: boolean;
  waived: boolean;
}

export async function fetchFeeSummary(startDate: string, endDate: string): Promise<FeeSummary> {
  const { data, error } = await supabase
    .from("no_show_fees")
    .select("reason, amount_aed, collected, waived")
    .gte("created_at", `${startDate}T00:00:00`)
    .lte("created_at", `${endDate}T23:59:59`);
  if (error) throw error;
  const rows = (data ?? []) as FeeRow[];

  const summary: FeeSummary = {
    issuedCount: rows.length,
    issuedAed: rows.reduce((sum, r) => sum + Number(r.amount_aed), 0),
    collectedCount: rows.filter((r) => r.collected).length,
    collectedAed: rows.filter((r) => r.collected).reduce((sum, r) => sum + Number(r.amount_aed), 0),
    waivedCount: rows.filter((r) => r.waived).length,
    waivedAed: rows.filter((r) => r.waived).reduce((sum, r) => sum + Number(r.amount_aed), 0),
    byReason: (["no_show", "late_cancel"] as const).map((reason) => {
      const forReason = rows.filter((r) => r.reason === reason);
      return {
        reason,
        count: forReason.length,
        amountAed: forReason.reduce((sum, r) => sum + Number(r.amount_aed), 0),
      };
    }),
  };
  return summary;
}

export interface OutstandingSummary {
  count: number;
  amountAed: number;
}

export async function fetchOutstandingFeeTotal(): Promise<OutstandingSummary> {
  const { data, error } = await supabase
    .from("no_show_fees")
    .select("amount_aed")
    .eq("collected", false)
    .eq("waived", false);
  if (error) throw error;
  const rows = (data ?? []) as { amount_aed: number }[];
  return {
    count: rows.length,
    amountAed: rows.reduce((sum, r) => sum + Number(r.amount_aed), 0),
  };
}

export interface CreditAdjustmentTotals {
  reformerAdded: number;
  reformerRemoved: number;
  matAdded: number;
  matRemoved: number;
}

export interface CreditAdjustmentEntry {
  id: string;
  clientName: string;
  family: "reformer" | "mat";
  delta: number;
  reason: string | null;
  createdAt: string;
}

interface CreditAdjustmentRow {
  id: string;
  family: "reformer" | "mat";
  delta: number;
  reason: string | null;
  created_at: string;
  clients: { full_name: string } | null;
}

export async function fetchCreditAdjustments(
  startDate: string,
  endDate: string,
): Promise<{ totals: CreditAdjustmentTotals; entries: CreditAdjustmentEntry[] }> {
  const { data, error } = await supabase
    .from("credit_adjustments")
    .select("id, family, delta, reason, created_at, clients(full_name)")
    .gte("created_at", `${startDate}T00:00:00`)
    .lte("created_at", `${endDate}T23:59:59`)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as unknown as CreditAdjustmentRow[];

  const totals: CreditAdjustmentTotals = { reformerAdded: 0, reformerRemoved: 0, matAdded: 0, matRemoved: 0 };
  for (const r of rows) {
    if (r.family === "reformer") {
      if (r.delta > 0) totals.reformerAdded += r.delta;
      else totals.reformerRemoved += -r.delta;
    } else {
      if (r.delta > 0) totals.matAdded += r.delta;
      else totals.matRemoved += -r.delta;
    }
  }

  return {
    totals,
    entries: rows.map((r) => ({
      id: r.id,
      clientName: r.clients?.full_name ?? "—",
      family: r.family,
      delta: r.delta,
      reason: r.reason,
      createdAt: r.created_at,
    })),
  };
}
