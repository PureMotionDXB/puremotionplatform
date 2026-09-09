"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getErrorMessage } from "@/lib/schedule-data";
import {
  fetchMyStaffInfo,
  fetchOccupancyReport,
  type OccupancyReport,
} from "@/lib/admin-db";

const familyLabel: Record<string, string> = { reformer: "Reformer", mat: "Mat" };

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function AdminReportsPage() {
  const router = useRouter();
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return toISODate(d);
  });
  const [endDate, setEndDate] = useState(() => toISODate(new Date()));
  const [report, setReport] = useState<OccupancyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMyStaffInfo().then((info) => {
      if (info?.role === "instructor") router.replace("/admin/roster");
    });
  }, [router]);

  useEffect(() => {
    load();
  }, [startDate, endDate]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setReport(await fetchOccupancyReport(startDate, endDate));
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load the report."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex-1 bg-bg">
      <div className="mx-auto max-w-4xl px-7 py-8">
        <h1 className="font-display text-[23px] font-bold text-ink">Reports</h1>
        <p className="mt-1 text-[13px] text-muted">
          Occupancy and attendance for a date range.
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
          <p className="mt-5 text-[13px] text-muted">Loading report&hellip;</p>
        ) : report ? (
          <>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-border bg-surface p-4">
                <div className="text-[11px] font-bold uppercase tracking-wide text-muted">
                  Classes held
                </div>
                <div className="mt-1 font-display text-[24px] font-bold text-ink">
                  {report.totalClasses}
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-surface p-4">
                <div className="text-[11px] font-bold uppercase tracking-wide text-muted">
                  Occupancy
                </div>
                <div className="mt-1 font-display text-[24px] font-bold text-ink">
                  {report.occupancyPct}%
                </div>
                <div className="mt-0.5 text-[11px] text-muted">
                  {report.totalOccupied}/{report.totalCapacity} spots filled
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-surface p-4">
                <div className="text-[11px] font-bold uppercase tracking-wide text-muted">
                  Attendance rate
                </div>
                <div className="mt-1 font-display text-[24px] font-bold text-ink">
                  {report.attendanceRate === null ? "—" : `${report.attendanceRate}%`}
                </div>
                <div className="mt-0.5 text-[11px] text-muted">Of checked classes</div>
              </div>
              <div className="rounded-2xl border border-border bg-surface p-4">
                <div className="text-[11px] font-bold uppercase tracking-wide text-muted">
                  No-shows
                </div>
                <div className="mt-1 font-display text-[24px] font-bold text-status-critical">
                  {report.totalNoShow}
                </div>
              </div>
            </div>

            <h2 className="mt-7 text-[14.5px] font-bold text-ink">By class</h2>
            {report.byClass.length === 0 ? (
              <p className="mt-2 text-[13px] text-muted">No classes in this range.</p>
            ) : (
              <div className="mt-2.5 overflow-x-auto rounded-2xl border border-border bg-surface">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-border text-left text-[11px] font-bold uppercase tracking-wide text-muted">
                      <th className="px-3 py-2.5">Class</th>
                      <th className="px-3 py-2.5">Category</th>
                      <th className="px-3 py-2.5">Sessions</th>
                      <th className="px-3 py-2.5">Occupancy</th>
                      <th className="px-3 py-2.5">Attended</th>
                      <th className="px-3 py-2.5">No-shows</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.byClass.map((c) => (
                      <tr key={c.name} className="border-b border-border last:border-none">
                        <td className="px-3 py-2.5 font-semibold">{c.name}</td>
                        <td className="px-3 py-2.5 text-ink-secondary">
                          {familyLabel[c.family]}
                        </td>
                        <td className="px-3 py-2.5 font-mono">{c.sessions}</td>
                        <td className="px-3 py-2.5 font-mono">
                          {c.occupancyPct}%{" "}
                          <span className="text-muted">
                            ({c.totalOccupied}/{c.totalCapacity})
                          </span>
                        </td>
                        <td className="px-3 py-2.5 font-mono">{c.attended}</td>
                        <td className="px-3 py-2.5 font-mono text-status-critical">
                          {c.noShow}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : null}
      </div>
    </main>
  );
}
