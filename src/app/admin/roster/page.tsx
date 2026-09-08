"use client";

import { useEffect, useMemo, useState } from "react";
import { firstName, getErrorMessage, type Instructor } from "@/lib/schedule-data";
import { fetchInstructors } from "@/lib/schedule-db";
import { fetchRoster, type RosterEntry } from "@/lib/admin-db";

const familyLabel: Record<string, string> = { reformer: "Reformer", mat: "Mat" };
const statusLabel: Record<string, string> = { booked: "Booked", waitlisted: "Waitlisted" };

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function AdminRosterPage() {
  const [date, setDate] = useState(() => toISODate(new Date()));
  const [entries, setEntries] = useState<RosterEntry[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, [date]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [rosterData, instructorData] = await Promise.all([
        fetchRoster(date),
        fetchInstructors(),
      ]);
      setEntries(rosterData);
      setInstructors(instructorData);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load the roster."));
    } finally {
      setLoading(false);
    }
  }

  const instructorName = useMemo(
    () => new Map(instructors.map((i) => [i.id, firstName(i.name)])),
    [instructors],
  );

  return (
    <main className="flex-1 bg-bg">
      <div className="mx-auto max-w-4xl px-7 py-8">
        <h1 className="font-display text-[23px] font-bold text-ink">Roster</h1>
        <p className="mt-1 text-[13px] text-muted">
          See who&rsquo;s booked into each class on a given day.
        </p>

        <input
          type="date"
          className="field-input mt-5 max-w-[200px]"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />

        {error && (
          <div className="mt-5 rounded-2xl border border-status-critical bg-status-critical-soft p-4 text-[13px] text-status-critical">
            {error}
          </div>
        )}

        <div className="mt-5 flex flex-col gap-4">
          {loading ? (
            <p className="text-[13px] text-muted">Loading roster&hellip;</p>
          ) : entries.length === 0 ? (
            <p className="text-[13px] text-muted">No classes scheduled this day.</p>
          ) : (
            entries.map((entry) => (
              <div
                key={entry.occurrenceId}
                className="rounded-2xl border border-border bg-surface p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[14px] font-semibold text-ink">
                        {entry.time}
                      </span>
                      <span className="text-[14.5px] font-bold text-ink">{entry.name}</span>
                      {entry.ladiesOnly && (
                        <span className="rounded-full bg-secondary-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-secondary-strong">
                          Ladies only
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 text-[12px] text-muted">
                      {instructorName.get(entry.instructor) ?? "No instructor assigned"} &middot;{" "}
                      {familyLabel[entry.family]}
                    </div>
                  </div>
                  <span className="font-mono text-[13px] font-semibold text-ink-secondary">
                    {entry.bookings.filter((b) => b.status === "booked").length}/{entry.capacity}
                  </span>
                </div>

                {entry.bookings.length === 0 ? (
                  <p className="mt-3 text-[12.5px] text-muted">No one booked yet.</p>
                ) : (
                  <div className="mt-3 overflow-x-auto rounded-xl border border-border">
                    <table className="w-full text-[12.5px]">
                      <thead>
                        <tr className="border-b border-border text-left text-[10.5px] font-bold uppercase tracking-wide text-muted">
                          <th className="px-3 py-2">Client</th>
                          <th className="px-3 py-2">Phone</th>
                          <th className="px-3 py-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entry.bookings.map((b) => (
                          <tr key={b.id} className="border-b border-border last:border-none">
                            <td className="px-3 py-2 font-semibold">{b.clientName || "—"}</td>
                            <td className="px-3 py-2 text-ink-secondary">
                              {b.clientPhone || "—"}
                            </td>
                            <td className="px-3 py-2">
                              <span
                                className={
                                  b.status === "waitlisted"
                                    ? "font-bold text-status-warning"
                                    : "font-bold text-status-good"
                                }
                              >
                                {statusLabel[b.status]}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
