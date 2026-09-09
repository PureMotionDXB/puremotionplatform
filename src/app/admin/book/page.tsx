"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ClassCard } from "@/components/ClassCard";
import { firstName, getErrorMessage, statusFor, type Instructor } from "@/lib/schedule-data";
import { fetchInstructors } from "@/lib/schedule-db";
import { ensureOccurrences } from "@/lib/booking-db";
import {
  adminBookClass,
  adminCancelBooking,
  fetchAllClients,
  fetchMyStaffInfo,
  fetchOccurrencesForClient,
  type AdminClient,
  type AdminOccurrenceView,
} from "@/lib/admin-db";

const DAYS_AHEAD = 14;

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function dateLabel(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  return {
    weekday: d.toLocaleDateString(undefined, { weekday: "short" }).toUpperCase(),
    day: d.getDate(),
  };
}

export default function AdminBookPage() {
  return (
    <Suspense fallback={null}>
      <AdminBookContent />
    </Suspense>
  );
}

function AdminBookContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectClientId = searchParams.get("client");

  const dates = useMemo(() => {
    const today = new Date();
    return Array.from({ length: DAYS_AHEAD }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      return toISODate(d);
    });
  }, []);

  const [clients, setClients] = useState<AdminClient[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [selectedClient, setSelectedClient] = useState<AdminClient | null>(null);
  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState(dates[0]);
  const [occurrences, setOccurrences] = useState<AdminOccurrenceView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    fetchMyStaffInfo().then((info) => {
      if (info?.role === "instructor") router.replace("/admin/roster");
    });
  }, [router]);

  useEffect(() => {
    init();
  }, []);

  async function init() {
    setLoading(true);
    setError(null);
    try {
      await ensureOccurrences();
      const [clientData, instructorData] = await Promise.all([
        fetchAllClients(),
        fetchInstructors(),
      ]);
      setClients(clientData);
      setInstructors(instructorData);
      if (preselectClientId) {
        const match = clientData.find((c) => c.id === preselectClientId);
        if (match) setSelectedClient(match);
      }
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (selectedClient) loadOccurrences();
  }, [selectedClient, selectedDate]);

  async function loadOccurrences() {
    if (!selectedClient) return;
    setError(null);
    try {
      const data = await fetchOccurrencesForClient(
        selectedClient.id,
        dates[0],
        dates[dates.length - 1],
      );
      setOccurrences(data);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load the schedule."));
    }
  }

  const instructorName = useMemo(
    () => new Map(instructors.map((i) => [i.id, firstName(i.name)])),
    [instructors],
  );

  const items = useMemo(
    () =>
      occurrences
        .filter((o) => o.date === selectedDate)
        .sort((a, b) => a.time.localeCompare(b.time)),
    [occurrences, selectedDate],
  );

  const filteredClients = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(
      (c) =>
        c.fullName.toLowerCase().includes(q) || (c.phone ?? "").toLowerCase().includes(q),
    );
  }, [clients, search]);

  async function handleBook(occurrenceId: string) {
    if (!selectedClient) return;
    setBusyId(occurrenceId);
    setError(null);
    try {
      await adminBookClass(selectedClient.id, occurrenceId);
      await loadOccurrences();
      setClients(await fetchAllClients());
    } catch (err) {
      setError(getErrorMessage(err, "Failed to book this class."));
    } finally {
      setBusyId(null);
    }
  }

  async function handleCancel(bookingId: string, occurrenceId: string) {
    if (!confirm("Cancel this client's booking?")) return;
    setBusyId(occurrenceId);
    setError(null);
    try {
      await adminCancelBooking(bookingId);
      await loadOccurrences();
      setClients(await fetchAllClients());
    } catch (err) {
      setError(getErrorMessage(err, "Failed to cancel."));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="flex-1 bg-bg">
      <div className="mx-auto max-w-6xl px-7 py-8">
        <h1 className="font-display text-[23px] font-bold text-ink">Book for a client</h1>
        <p className="mt-1 text-[13px] text-muted">
          Phone bookings, walk-ins, or anything a client can&rsquo;t do themselves — same
          rules as self-service booking (capacity, credits, ladies only, 12h cancellation).
        </p>

        {error && (
          <div className="mt-5 rounded-2xl border border-status-critical bg-status-critical-soft p-4 text-[13px] text-status-critical">
            {error}
          </div>
        )}

        {!selectedClient ? (
          <div className="mt-5">
            <input
              className="field-input max-w-[320px]"
              placeholder="Search by name or phone"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
            <div className="mt-3 overflow-x-auto rounded-2xl border border-border bg-surface">
              {loading ? (
                <p className="p-5 text-[13px] text-muted">Loading clients&hellip;</p>
              ) : filteredClients.length === 0 ? (
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
                    {filteredClients.map((c) => (
                      <tr key={c.id} className="border-b border-border last:border-none">
                        <td className="px-3 py-2.5 font-semibold">{c.fullName || "—"}</td>
                        <td className="px-3 py-2.5 text-ink-secondary">{c.phone || "—"}</td>
                        <td className="px-3 py-2.5 font-mono">{c.reformerCredits}</td>
                        <td className="px-3 py-2.5 font-mono">{c.matCredits}</td>
                        <td className="px-3 py-2.5 text-right">
                          <button
                            onClick={() => setSelectedClient(c)}
                            className="text-[12px] font-bold text-accent-strong hover:underline"
                          >
                            Select
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4">
              <div>
                <div className="text-[14.5px] font-bold text-ink">
                  {selectedClient.fullName || "—"}
                </div>
                <div className="mt-0.5 text-[12px] text-muted">
                  {selectedClient.phone || "No phone"} &middot; {selectedClient.reformerCredits}{" "}
                  Reformer &middot; {selectedClient.matCredits} Mat
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedClient(null);
                  setOccurrences([]);
                }}
                className="text-[12.5px] font-bold text-ink-secondary hover:text-ink hover:underline"
              >
                Change client
              </button>
            </div>

            <div className="mt-5 flex gap-1.5 overflow-x-auto pb-1">
              {dates.map((iso, i) => {
                const { weekday, day } = dateLabel(iso);
                const active = iso === selectedDate;
                return (
                  <button
                    key={iso}
                    onClick={() => setSelectedDate(iso)}
                    className={`min-w-[64px] shrink-0 rounded-[10px] border px-3.5 py-2 text-center text-[12.5px] font-bold transition ${
                      active
                        ? "border-ink bg-ink text-bg"
                        : "border-border bg-surface text-ink-secondary hover:bg-surface-2"
                    }`}
                  >
                    <span
                      className={`block text-[10px] font-semibold uppercase tracking-wide ${
                        active ? "text-bg/60" : "text-muted"
                      }`}
                    >
                      {weekday}
                    </span>
                    {i === 0 ? "Today" : day}
                  </button>
                );
              })}
            </div>

            <div className="mt-5 flex flex-col gap-2.5">
              {items.length === 0 ? (
                <div className="rounded-2xl border border-border bg-surface p-5 text-center text-[13px] text-muted">
                  No classes scheduled this day.
                </div>
              ) : (
                items.map((occ) => {
                  const full =
                    statusFor({ capacity: occ.capacity, booked: occ.bookedCount }) === "critical";
                  const waitlistFull = occ.waitlistCount >= 2;
                  const busy = busyId === occ.occurrenceId;

                  let action;
                  if (occ.clientStatus === "booked") {
                    action = (
                      <button
                        onClick={() =>
                          occ.clientBookingId && handleCancel(occ.clientBookingId, occ.occurrenceId)
                        }
                        disabled={busy}
                        className="w-full shrink-0 rounded-[9px] border border-status-critical px-4 py-2 text-[13px] font-bold text-status-critical transition hover:bg-status-critical-soft disabled:opacity-50 sm:w-auto"
                      >
                        {busy ? "Cancelling…" : "Booked · Cancel"}
                      </button>
                    );
                  } else if (occ.clientStatus === "waitlisted") {
                    action = (
                      <button
                        onClick={() =>
                          occ.clientBookingId && handleCancel(occ.clientBookingId, occ.occurrenceId)
                        }
                        disabled={busy}
                        className="w-full shrink-0 rounded-[9px] border border-status-warning px-4 py-2 text-[13px] font-bold text-status-warning transition hover:bg-status-warning-soft disabled:opacity-50 sm:w-auto"
                      >
                        {busy ? "Cancelling…" : "Waitlisted · Cancel"}
                      </button>
                    );
                  } else if (full && waitlistFull) {
                    action = (
                      <button
                        disabled
                        className="w-full shrink-0 rounded-[9px] border border-border-strong px-4 py-2 text-[13px] font-bold text-muted opacity-60 sm:w-auto"
                      >
                        Full
                      </button>
                    );
                  } else {
                    action = (
                      <button
                        onClick={() => handleBook(occ.occurrenceId)}
                        disabled={busy}
                        className={`w-full shrink-0 rounded-[9px] px-4 py-2 text-[13px] font-bold transition disabled:opacity-50 sm:w-auto ${
                          full
                            ? "border border-border-strong text-ink hover:bg-surface-2"
                            : "bg-accent-strong text-accent-ink hover:brightness-110"
                        }`}
                      >
                        {busy ? "Booking…" : full ? "Join waitlist" : "Book"}
                      </button>
                    );
                  }

                  return (
                    <ClassCard
                      key={occ.occurrenceId}
                      cls={{
                        time: occ.time,
                        name: occ.name,
                        family: occ.family,
                        ladiesOnly: occ.ladiesOnly,
                        capacity: occ.capacity,
                        booked: occ.bookedCount,
                      }}
                      instructorName={instructorName.get(occ.instructor) ?? occ.instructor}
                      action={action}
                    />
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
