"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getErrorMessage, statusFor } from "@/lib/schedule-data";
import {
  fetchMyStaffInfo,
  fetchOutstandingFees,
  fetchRoster,
  type OutstandingFee,
  type RosterEntry,
  type StaffInfo,
} from "@/lib/admin-db";
import { fetchClientSegments, type ClientSegment } from "@/lib/segments-db";
import { fetchFeeSummary, fetchOutstandingFeeTotal, type FeeSummary, type OutstandingSummary } from "@/lib/finance-db";

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [staffInfo, setStaffInfo] = useState<StaffInfo | null>(null);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [fees, setFees] = useState<OutstandingFee[]>([]);
  const [segments, setSegments] = useState<ClientSegment[]>([]);
  const [weekFees, setWeekFees] = useState<FeeSummary | null>(null);
  const [outstandingTotal, setOutstandingTotal] = useState<OutstandingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMyStaffInfo().then((info) => {
      if (info?.role === "instructor") {
        router.replace("/admin/roster");
        return;
      }
      setStaffInfo(info);
    });
  }, [router]);

  useEffect(() => {
    if (!staffInfo) return;
    load();
  }, [staffInfo]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const today = toISODate(new Date());
      const weekAgo = toISODate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));

      const tasks: Promise<unknown>[] = [
        fetchRoster(today).then(setRoster),
        fetchOutstandingFees().then(setFees),
        fetchClientSegments().then(setSegments),
      ];
      if (staffInfo?.role === "owner") {
        tasks.push(fetchFeeSummary(weekAgo, today).then(setWeekFees));
        tasks.push(fetchOutstandingFeeTotal().then(setOutstandingTotal));
      }
      await Promise.all(tasks);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load the dashboard."));
    } finally {
      setLoading(false);
    }
  }

  const todayStats = useMemo(() => {
    let totalCapacity = 0;
    let totalOccupied = 0;
    let fullCount = 0;
    for (const cls of roster) {
      const occupied = cls.bookings.filter((b) =>
        ["booked", "attended", "no_show"].includes(b.status),
      ).length;
      totalCapacity += cls.capacity;
      totalOccupied += occupied;
      if (statusFor({ capacity: cls.capacity, booked: occupied }) === "critical") fullCount += 1;
    }
    return {
      classCount: roster.length,
      totalCapacity,
      totalOccupied,
      fullCount,
      occupancyPct: totalCapacity > 0 ? Math.round((totalOccupied / totalCapacity) * 100) : 0,
    };
  }, [roster]);

  const segmentCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of segments) counts[c.segment] = (counts[c.segment] ?? 0) + 1;
    return counts;
  }, [segments]);

  const outstandingFeeTotal = useMemo(
    () => fees.reduce((sum, f) => sum + f.amountAed, 0),
    [fees],
  );

  if (loading) {
    return (
      <main className="flex-1 bg-bg px-7 py-8">
        <p className="text-[13px] text-muted">Loading dashboard&hellip;</p>
      </main>
    );
  }

  return (
    <main className="flex-1 bg-bg">
      <div className="mx-auto max-w-4xl px-7 py-8">
        <h1 className="font-display text-[23px] font-bold text-ink">Dashboard</h1>
        <p className="mt-1 text-[13px] text-muted">
          A quick glance at today, and what needs your attention.
        </p>

        {error && (
          <div className="mt-5 rounded-2xl border border-status-critical bg-status-critical-soft p-4 text-[13px] text-status-critical">
            {error}
          </div>
        )}

        <h2 className="mt-7 text-[13px] font-bold uppercase tracking-wide text-muted">Today</h2>
        <div className="mt-2.5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-border bg-surface p-4">
            <div className="text-[11px] font-bold uppercase tracking-wide text-muted">
              Classes today
            </div>
            <div className="mt-1 font-display text-[24px] font-bold text-ink">
              {todayStats.classCount}
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-4">
            <div className="text-[11px] font-bold uppercase tracking-wide text-muted">
              Occupancy
            </div>
            <div className="mt-1 font-display text-[24px] font-bold text-ink">
              {todayStats.occupancyPct}%
            </div>
            <div className="mt-0.5 text-[11px] text-muted">
              {todayStats.totalOccupied}/{todayStats.totalCapacity} spots
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-4">
            <div className="text-[11px] font-bold uppercase tracking-wide text-muted">
              Full classes
            </div>
            <div className="mt-1 font-display text-[24px] font-bold text-status-warning">
              {todayStats.fullCount}
            </div>
          </div>
          <Link
            href="/admin/roster"
            className="flex flex-col justify-between rounded-2xl border border-border-strong bg-surface p-4 transition hover:bg-surface-2"
          >
            <div className="text-[11px] font-bold uppercase tracking-wide text-muted">
              Roster
            </div>
            <div className="mt-1 text-[13px] font-bold text-accent-strong">
              Check in clients &rarr;
            </div>
          </Link>
        </div>

        <h2 className="mt-8 text-[13px] font-bold uppercase tracking-wide text-muted">
          Needs attention
        </h2>
        <div className="mt-2.5 grid gap-3 sm:grid-cols-2">
          <Link
            href="/admin/clients"
            className="rounded-2xl border border-status-warning bg-status-warning-soft p-4 transition hover:brightness-[0.98]"
          >
            <div className="text-[11px] font-bold uppercase tracking-wide text-status-warning">
              Outstanding fees
            </div>
            <div className="mt-1 font-display text-[22px] font-bold text-ink">
              AED {outstandingFeeTotal}
            </div>
            <div className="mt-0.5 text-[11.5px] text-muted">
              {fees.length} unresolved &middot; resolve on Clients &rarr;
            </div>
          </Link>
          <Link
            href="/admin/segments"
            className="rounded-2xl border border-border bg-surface p-4 transition hover:bg-surface-2"
          >
            <div className="text-[11px] font-bold uppercase tracking-wide text-muted">
              Client follow-ups
            </div>
            <div className="mt-1 text-[13px] text-ink-secondary">
              <b className="text-ink">{segmentCounts.first_timer ?? 0}</b> first-timers &middot;{" "}
              <b className="text-ink">{(segmentCounts.lapsed ?? 0) + (segmentCounts.lost ?? 0)}</b>{" "}
              lapsed/lost
            </div>
            <div className="mt-1 text-[11.5px] font-bold text-accent-strong">
              View segments &rarr;
            </div>
          </Link>
        </div>

        {staffInfo?.role === "owner" && (
          <>
            <h2 className="mt-8 text-[13px] font-bold uppercase tracking-wide text-muted">
              This week (Owner)
            </h2>
            <div className="mt-2.5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-border bg-surface p-4">
                <div className="text-[11px] font-bold uppercase tracking-wide text-muted">
                  Fees issued
                </div>
                <div className="mt-1 font-display text-[22px] font-bold text-ink">
                  AED {weekFees?.issuedAed ?? 0}
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-surface p-4">
                <div className="text-[11px] font-bold uppercase tracking-wide text-muted">
                  Collected
                </div>
                <div className="mt-1 font-display text-[22px] font-bold text-status-good">
                  AED {weekFees?.collectedAed ?? 0}
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-surface p-4">
                <div className="text-[11px] font-bold uppercase tracking-wide text-muted">
                  Outstanding (all time)
                </div>
                <div className="mt-1 font-display text-[22px] font-bold text-status-warning">
                  AED {outstandingTotal?.amountAed ?? 0}
                </div>
              </div>
              <Link
                href="/admin/finance"
                className="flex flex-col justify-between rounded-2xl border border-border-strong bg-surface p-4 transition hover:bg-surface-2"
              >
                <div className="text-[11px] font-bold uppercase tracking-wide text-muted">
                  Finance
                </div>
                <div className="mt-1 text-[13px] font-bold text-accent-strong">
                  Full breakdown &rarr;
                </div>
              </Link>
            </div>
          </>
        )}

        <h2 className="mt-8 text-[13px] font-bold uppercase tracking-wide text-muted">
          Quick links
        </h2>
        <div className="mt-2.5 flex flex-wrap gap-2.5">
          <Link
            href="/admin/book"
            className="rounded-[9px] bg-accent-strong px-4 py-2.5 text-[13px] font-bold text-accent-ink transition hover:brightness-110"
          >
            Book for a client
          </Link>
          <Link
            href="/admin/schedule"
            className="rounded-[9px] border border-border-strong px-4 py-2.5 text-[13px] font-bold text-ink transition hover:bg-surface-2"
          >
            Manage schedule
          </Link>
          <Link
            href="/admin/clients"
            className="rounded-[9px] border border-border-strong px-4 py-2.5 text-[13px] font-bold text-ink transition hover:bg-surface-2"
          >
            Clients
          </Link>
          <Link
            href="/admin/instructors"
            className="rounded-[9px] border border-border-strong px-4 py-2.5 text-[13px] font-bold text-ink transition hover:bg-surface-2"
          >
            Instructors
          </Link>
        </div>
      </div>
    </main>
  );
}
