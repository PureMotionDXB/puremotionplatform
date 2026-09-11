"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getErrorMessage } from "@/lib/schedule-data";
import { fetchMyStaffInfo } from "@/lib/admin-db";
import {
  fetchCreditAdjustments,
  fetchFeeSummary,
  fetchOutstandingFeeTotal,
  type CreditAdjustmentEntry,
  type CreditAdjustmentTotals,
  type FeeSummary,
  type OutstandingSummary,
} from "@/lib/finance-db";

const reasonLabel: Record<string, string> = {
  no_show: "No-show",
  late_cancel: "Late cancellation",
};

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function AdminFinancePage() {
  const router = useRouter();
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return toISODate(d);
  });
  const [endDate, setEndDate] = useState(() => toISODate(new Date()));

  const [feeSummary, setFeeSummary] = useState<FeeSummary | null>(null);
  const [outstanding, setOutstanding] = useState<OutstandingSummary | null>(null);
  const [creditTotals, setCreditTotals] = useState<CreditAdjustmentTotals | null>(null);
  const [creditEntries, setCreditEntries] = useState<CreditAdjustmentEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMyStaffInfo().then((info) => {
      if (info?.role === "instructor") router.replace("/admin/roster");
      else if (info?.role !== "owner") router.replace("/admin/schedule");
    });
  }, [router]);

  useEffect(() => {
    load();
  }, [startDate, endDate]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [fees, out, credits] = await Promise.all([
        fetchFeeSummary(startDate, endDate),
        fetchOutstandingFeeTotal(),
        fetchCreditAdjustments(startDate, endDate),
      ]);
      setFeeSummary(fees);
      setOutstanding(out);
      setCreditTotals(credits.totals);
      setCreditEntries(credits.entries);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load finance data."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex-1 bg-bg">
      <div className="mx-auto max-w-4xl px-7 py-8">
        <h1 className="font-display text-[23px] font-bold text-ink">Finance</h1>
        <p className="mt-1 text-[13px] text-muted">
          No-show/late-cancellation fees (real AED) and credit adjustment activity. There&rsquo;s
          no live payment integration yet, so this isn&rsquo;t a full revenue picture — only
          what&rsquo;s actually tracked in AED.
        </p>

        <div className="mt-5 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wide text-muted">From</span>
            <input
              type="date"
              className="field-input"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wide text-muted">To</span>
            <input
              type="date"
              className="field-input"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </label>
        </div>

        {error && (
          <div className="mt-5 rounded-2xl border border-status-critical bg-status-critical-soft p-4 text-[13px] text-status-critical">
            {error}
          </div>
        )}

        {loading ? (
          <p className="mt-5 text-[13px] text-muted">Loading&hellip;</p>
        ) : (
          <>
            <h2 className="mt-7 text-[14.5px] font-bold text-ink">Fees (AED)</h2>
            <div className="mt-2.5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-border bg-surface p-4">
                <div className="text-[11px] font-bold uppercase tracking-wide text-muted">
                  Issued
                </div>
                <div className="mt-1 font-display text-[22px] font-bold text-ink">
                  {feeSummary?.issuedAed ?? 0}
                </div>
                <div className="mt-0.5 text-[11px] text-muted">{feeSummary?.issuedCount ?? 0} fees</div>
              </div>
              <div className="rounded-2xl border border-border bg-surface p-4">
                <div className="text-[11px] font-bold uppercase tracking-wide text-muted">
                  Collected
                </div>
                <div className="mt-1 font-display text-[22px] font-bold text-status-good">
                  {feeSummary?.collectedAed ?? 0}
                </div>
                <div className="mt-0.5 text-[11px] text-muted">{feeSummary?.collectedCount ?? 0} fees</div>
              </div>
              <div className="rounded-2xl border border-border bg-surface p-4">
                <div className="text-[11px] font-bold uppercase tracking-wide text-muted">
                  Waived
                </div>
                <div className="mt-1 font-display text-[22px] font-bold text-ink-secondary">
                  {feeSummary?.waivedAed ?? 0}
                </div>
                <div className="mt-0.5 text-[11px] text-muted">{feeSummary?.waivedCount ?? 0} fees</div>
              </div>
              <div className="rounded-2xl border border-border bg-surface p-4">
                <div className="text-[11px] font-bold uppercase tracking-wide text-muted">
                  Outstanding now
                </div>
                <div className="mt-1 font-display text-[22px] font-bold text-status-warning">
                  {outstanding?.amountAed ?? 0}
                </div>
                <div className="mt-0.5 text-[11px] text-muted">
                  {outstanding?.count ?? 0} fees &middot; all time
                </div>
              </div>
            </div>
            {feeSummary && feeSummary.byReason.some((r) => r.count > 0) && (
              <div className="mt-2.5 flex gap-4 text-[12.5px] text-muted">
                {feeSummary.byReason.map((r) => (
                  <span key={r.reason}>
                    {reasonLabel[r.reason]}: {r.count} &middot; AED {r.amountAed}
                  </span>
                ))}
              </div>
            )}

            <h2 className="mt-8 text-[14.5px] font-bold text-ink">Credit adjustments</h2>
            <p className="mt-1 text-[12px] text-muted">
              Manual top-ups and corrections made from the Clients page — not currency, just
              credits granted or removed.
            </p>
            <div className="mt-2.5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-border bg-surface p-4">
                <div className="text-[11px] font-bold uppercase tracking-wide text-muted">
                  Reformer added
                </div>
                <div className="mt-1 font-display text-[22px] font-bold text-status-good">
                  +{creditTotals?.reformerAdded ?? 0}
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-surface p-4">
                <div className="text-[11px] font-bold uppercase tracking-wide text-muted">
                  Reformer removed
                </div>
                <div className="mt-1 font-display text-[22px] font-bold text-status-critical">
                  -{creditTotals?.reformerRemoved ?? 0}
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-surface p-4">
                <div className="text-[11px] font-bold uppercase tracking-wide text-muted">
                  Mat added
                </div>
                <div className="mt-1 font-display text-[22px] font-bold text-status-good">
                  +{creditTotals?.matAdded ?? 0}
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-surface p-4">
                <div className="text-[11px] font-bold uppercase tracking-wide text-muted">
                  Mat removed
                </div>
                <div className="mt-1 font-display text-[22px] font-bold text-status-critical">
                  -{creditTotals?.matRemoved ?? 0}
                </div>
              </div>
            </div>

            {creditEntries.length === 0 ? (
              <p className="mt-3 text-[13px] text-muted">No adjustments in this range.</p>
            ) : (
              <div className="mt-3 overflow-x-auto rounded-2xl border border-border bg-surface">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-border text-left text-[11px] font-bold uppercase tracking-wide text-muted">
                      <th className="px-3 py-2.5">Date</th>
                      <th className="px-3 py-2.5">Client</th>
                      <th className="px-3 py-2.5">Family</th>
                      <th className="px-3 py-2.5">Delta</th>
                      <th className="px-3 py-2.5">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {creditEntries.map((e) => (
                      <tr key={e.id} className="border-b border-border last:border-none">
                        <td className="px-3 py-2.5 text-ink-secondary">
                          {new Date(e.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-3 py-2.5 font-semibold">{e.clientName}</td>
                        <td className="px-3 py-2.5 text-ink-secondary capitalize">{e.family}</td>
                        <td
                          className={`px-3 py-2.5 font-mono font-bold ${
                            e.delta > 0 ? "text-status-good" : "text-status-critical"
                          }`}
                        >
                          {e.delta > 0 ? `+${e.delta}` : e.delta}
                        </td>
                        <td className="px-3 py-2.5 text-ink-secondary">{e.reason || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
