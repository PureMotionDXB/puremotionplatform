"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getErrorMessage } from "@/lib/schedule-data";
import {
  adjustCredits,
  fetchAllClients,
  fetchMyStaffInfo,
  fetchOutstandingFees,
  resolveFee,
  type AdminClient,
  type OutstandingFee,
} from "@/lib/admin-db";

type Family = "reformer" | "mat";

const feeReasonLabel: Record<string, string> = {
  no_show: "No-show",
  late_cancel: "Late cancellation",
};

export default function AdminClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<AdminClient[]>([]);
  const [fees, setFees] = useState<OutstandingFee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [adjustingId, setAdjustingId] = useState<string | null>(null);
  const [family, setFamily] = useState<Family>("reformer");
  const [delta, setDelta] = useState(1);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [resolvingFeeId, setResolvingFeeId] = useState<string | null>(null);

  useEffect(() => {
    fetchMyStaffInfo().then((info) => {
      if (info?.role === "instructor") router.replace("/admin/roster");
    });
  }, [router]);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setClients(await fetchAllClients());
      setFees(await fetchOutstandingFees());
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load clients."));
    } finally {
      setLoading(false);
    }
  }

  async function handleResolveFee(feeId: string, collected: boolean) {
    setResolvingFeeId(feeId);
    setError(null);
    try {
      await resolveFee(feeId, collected);
      setFees(await fetchOutstandingFees());
    } catch (err) {
      setError(getErrorMessage(err, "Failed to update the fee."));
    } finally {
      setResolvingFeeId(null);
    }
  }

  function startAdjust(clientId: string) {
    setAdjustingId(clientId);
    setFamily("reformer");
    setDelta(1);
    setReason("");
  }

  async function saveAdjustment() {
    if (!adjustingId || delta === 0 || saving) return;
    setSaving(true);
    setError(null);
    try {
      await adjustCredits(adjustingId, family, delta, reason);
      await load();
      setAdjustingId(null);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to adjust credits."));
    } finally {
      setSaving(false);
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(
      (c) =>
        c.fullName.toLowerCase().includes(q) || (c.phone ?? "").toLowerCase().includes(q),
    );
  }, [clients, search]);

  return (
    <main className="flex-1 bg-bg">
      <div className="mx-auto max-w-4xl px-7 py-8">
        <h1 className="font-display text-[23px] font-bold text-ink">Clients</h1>
        <p className="mt-1 text-[13px] text-muted">
          View client credit balances and make manual adjustments (cash payments, corrections,
          goodwill top-ups).
        </p>

        {error && (
          <div className="mt-5 rounded-2xl border border-status-critical bg-status-critical-soft p-4 text-[13px] text-status-critical">
            {error}
          </div>
        )}

        {fees.length > 0 && (
          <div className="mt-5 rounded-2xl border border-status-warning bg-status-warning-soft p-4">
            <h2 className="text-[13px] font-bold text-status-warning">
              Outstanding fees ({fees.length})
            </h2>
            <div className="mt-2.5 flex flex-col gap-2">
              {fees.map((f) => (
                <div
                  key={f.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface p-2.5"
                >
                  <div className="text-[12.5px]">
                    <span className="font-bold text-ink">{f.clientName}</span>
                    <span className="text-ink-secondary">
                      {" "}
                      &mdash; {feeReasonLabel[f.reason]} &middot; AED {f.amountAed}
                    </span>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleResolveFee(f.id, true)}
                      disabled={resolvingFeeId === f.id}
                      className="text-[11.5px] font-bold text-status-good hover:underline disabled:opacity-50"
                    >
                      Mark collected
                    </button>
                    <button
                      onClick={() => handleResolveFee(f.id, false)}
                      disabled={resolvingFeeId === f.id}
                      className="text-[11.5px] font-bold text-ink-secondary hover:underline disabled:opacity-50"
                    >
                      Waive
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <input
          className="field-input mt-5 max-w-[320px]"
          placeholder="Search by name or phone"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="mt-5 overflow-x-auto rounded-2xl border border-border bg-surface">
          {loading ? (
            <p className="p-5 text-[13px] text-muted">Loading clients&hellip;</p>
          ) : filtered.length === 0 ? (
            <p className="p-5 text-[13px] text-muted">No clients found.</p>
          ) : (
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border text-left text-[11px] font-bold uppercase tracking-wide text-muted">
                  <th className="px-3 py-2.5">Name</th>
                  <th className="px-3 py-2.5">Phone</th>
                  <th className="px-3 py-2.5">Reformer</th>
                  <th className="px-3 py-2.5">Mat</th>
                  <th className="px-3 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <Fragment key={c.id}>
                    <tr className="border-b border-border last:border-none">
                      <td className="px-3 py-2.5 font-semibold">{c.fullName || "—"}</td>
                      <td className="px-3 py-2.5 text-ink-secondary">{c.phone || "—"}</td>
                      <td className="px-3 py-2.5 font-mono">{c.reformerCredits}</td>
                      <td className="px-3 py-2.5 font-mono">{c.matCredits}</td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="flex justify-end gap-3">
                          <Link
                            href={`/admin/book?client=${c.id}`}
                            className="text-[12px] font-bold text-accent-strong hover:underline"
                          >
                            Book a class
                          </Link>
                          <button
                            onClick={() => startAdjust(c.id)}
                            className="text-[12px] font-bold text-accent-strong hover:underline"
                          >
                            Adjust credits
                          </button>
                        </div>
                      </td>
                    </tr>
                    {adjustingId === c.id && (
                      <tr key={`${c.id}-form`} className="border-b border-border bg-surface-2">
                        <td colSpan={5} className="p-4">
                          <div className="flex flex-wrap items-end gap-3">
                            <label className="flex flex-col gap-1.5">
                              <span className="text-[11px] font-bold uppercase tracking-wide text-muted">
                                Family
                              </span>
                              <select
                                className="field-input"
                                value={family}
                                onChange={(e) => setFamily(e.target.value as Family)}
                              >
                                <option value="reformer">Reformer</option>
                                <option value="mat">Mat</option>
                              </select>
                            </label>
                            <label className="flex flex-col gap-1.5">
                              <span className="text-[11px] font-bold uppercase tracking-wide text-muted">
                                Credits (+/-)
                              </span>
                              <input
                                type="number"
                                className="field-input w-[100px]"
                                value={delta}
                                onChange={(e) => setDelta(Number(e.target.value) || 0)}
                              />
                            </label>
                            <label className="flex min-w-[200px] flex-1 flex-col gap-1.5">
                              <span className="text-[11px] font-bold uppercase tracking-wide text-muted">
                                Reason
                              </span>
                              <input
                                className="field-input"
                                placeholder="e.g. Cash payment for 10-credit pack"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                              />
                            </label>
                            <button
                              onClick={saveAdjustment}
                              disabled={saving || delta === 0}
                              className="rounded-[9px] bg-accent-strong px-4 py-2.5 text-[13px] font-bold text-accent-ink hover:brightness-110 disabled:opacity-50"
                            >
                              {saving ? "Saving…" : "Save"}
                            </button>
                            <button
                              onClick={() => setAdjustingId(null)}
                              className="rounded-[9px] border border-border-strong px-4 py-2.5 text-[13px] font-bold text-ink hover:bg-surface"
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </main>
  );
}
