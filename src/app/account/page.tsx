"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getErrorMessage, statusFor, statusLabel as spotsLabel } from "@/lib/schedule-data";
import {
  cancelBooking,
  ensureOccurrences,
  fetchMyBookings,
  fetchMyClient,
  fetchMyFees,
  fetchOccurrences,
  rescheduleBooking,
  type ClientProfile,
  type MyBooking,
  type MyFee,
  type OccurrenceView,
} from "@/lib/booking-db";

const familyLabel: Record<string, string> = { reformer: "Reformer", mat: "Mat" };
const statusLabel: Record<string, string> = {
  cancelled: "Cancelled",
  attended: "Attended",
  no_show: "No-show",
};
const feeReasonLabel: Record<string, string> = {
  no_show: "No-show fee",
  late_cancel: "Late cancellation fee",
};

const RESCHEDULE_DAYS_AHEAD = 14;

function formatDate(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

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

export default function AccountPage() {
  const router = useRouter();
  const [client, setClient] = useState<ClientProfile | null>(null);
  const [bookings, setBookings] = useState<MyBooking[]>([]);
  const [fees, setFees] = useState<MyFee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const rescheduleDates = useMemo(() => {
    const today = new Date();
    return Array.from({ length: RESCHEDULE_DAYS_AHEAD }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      return toISODate(d);
    });
  }, []);
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState(rescheduleDates[0]);
  const [rescheduleOccurrences, setRescheduleOccurrences] = useState<OccurrenceView[]>([]);
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  const [reschedulingBusy, setReschedulingBusy] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const profile = await fetchMyClient();
      if (!profile) {
        router.push("/account/login");
        return;
      }
      setClient(profile);
      setBookings(await fetchMyBookings());
      setFees(await fetchMyFees());
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load your account."));
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel(bookingId: string) {
    if (!confirm("Cancel this booking?")) return;
    setCancellingId(bookingId);
    setError(null);
    try {
      await cancelBooking(bookingId);
      const profile = await fetchMyClient();
      setClient(profile);
      setBookings(await fetchMyBookings());
    } catch (err) {
      setError(getErrorMessage(err, "Failed to cancel."));
    } finally {
      setCancellingId(null);
    }
  }

  async function startReschedule(bookingId: string) {
    setReschedulingId(bookingId);
    setRescheduleDate(rescheduleDates[0]);
    setRescheduleLoading(true);
    setError(null);
    try {
      await ensureOccurrences();
      setRescheduleOccurrences(
        await fetchOccurrences(rescheduleDates[0], rescheduleDates[rescheduleDates.length - 1]),
      );
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load the schedule."));
    } finally {
      setRescheduleLoading(false);
    }
  }

  async function handleReschedulePick(newOccurrenceId: string) {
    if (!reschedulingId || reschedulingBusy) return;
    setReschedulingBusy(true);
    setError(null);
    try {
      await rescheduleBooking(reschedulingId, newOccurrenceId);
      setReschedulingId(null);
      const profile = await fetchMyClient();
      setClient(profile);
      setBookings(await fetchMyBookings());
    } catch (err) {
      setError(getErrorMessage(err, "Failed to reschedule."));
    } finally {
      setReschedulingBusy(false);
    }
  }

  async function logOut() {
    await supabase.auth.signOut();
    router.push("/account/login");
    router.refresh();
  }

  if (loading) {
    return (
      <main className="flex-1 bg-bg px-7 py-8">
        <p className="text-[13px] text-muted">Loading your account&hellip;</p>
      </main>
    );
  }

  if (!client) return null;

  const upcoming = bookings.filter((b) => b.status === "booked" || b.status === "waitlisted");
  const past = bookings.filter(
    (b) => b.status === "cancelled" || b.status === "attended" || b.status === "no_show",
  );

  const rescheduleItems = rescheduleOccurrences
    .filter((o) => o.date === rescheduleDate && o.myBookingId !== reschedulingId)
    .sort((a, b) => a.time.localeCompare(b.time));

  return (
    <main className="flex-1 bg-bg">
      <Header />
      <div className="mx-auto max-w-3xl px-7 py-8">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-[23px] font-bold text-ink">
            {client.fullName ? `Hi, ${client.fullName.split(" ")[0]}` : "My account"}
          </h1>
          <button
            onClick={logOut}
            className="text-[12px] font-bold text-status-critical hover:underline"
          >
            Log out
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-2xl border border-status-critical bg-status-critical-soft p-4 text-[13px] text-status-critical">
            {error}
          </div>
        )}

        {fees.length > 0 && (
          <div className="mt-4 rounded-2xl border border-status-warning bg-status-warning-soft p-4">
            <div className="text-[12.5px] font-bold text-status-warning">
              You have {fees.length === 1 ? "an outstanding fee" : `${fees.length} outstanding fees`}
            </div>
            <div className="mt-1.5 flex flex-col gap-1">
              {fees.map((f) => (
                <div key={f.id} className="text-[12.5px] text-ink-secondary">
                  {feeReasonLabel[f.reason]} &mdash; AED {f.amountAed}
                </div>
              ))}
            </div>
            <p className="mt-1.5 text-[11.5px] text-status-warning">
              Please settle this at the studio.
            </p>
          </div>
        )}

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border bg-surface p-4">
            <div className="text-[11px] font-bold uppercase tracking-wide text-muted">
              Reformer credits
            </div>
            <div className="mt-1 font-display text-[26px] font-bold text-ink">
              {client.reformerCredits}
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-4">
            <div className="text-[11px] font-bold uppercase tracking-wide text-muted">
              Mat credits
            </div>
            <div className="mt-1 font-display text-[26px] font-bold text-ink">
              {client.matCredits}
            </div>
          </div>
        </div>

        <h2 className="mt-7 text-[14.5px] font-bold text-ink">Upcoming classes</h2>
        <div className="mt-2.5 flex flex-col gap-2">
          {upcoming.length === 0 ? (
            <p className="text-[13px] text-muted">
              No upcoming bookings.{" "}
              <Link href="/schedule" className="font-bold text-accent-strong hover:underline">
                Browse the schedule
              </Link>
            </p>
          ) : (
            upcoming.map((b) => (
              <div
                key={b.id}
                className="rounded-2xl border border-border bg-surface p-3.5"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] font-bold text-ink">{b.name}</div>
                    <div className="mt-0.5 text-[12px] text-muted">
                      {formatDate(b.date)} &middot; {b.time} &middot; {familyLabel[b.family]}
                      {b.status === "waitlisted" && (
                        <span className="ml-2 rounded-full bg-status-warning-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-status-warning">
                          Waitlisted
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-3">
                    <button
                      onClick={() =>
                        reschedulingId === b.id ? setReschedulingId(null) : startReschedule(b.id)
                      }
                      className="text-[12px] font-bold text-accent-strong hover:underline"
                    >
                      {reschedulingId === b.id ? "Cancel reschedule" : "Reschedule"}
                    </button>
                    <button
                      onClick={() => handleCancel(b.id)}
                      disabled={cancellingId === b.id}
                      className="text-[12px] font-bold text-status-critical hover:underline disabled:opacity-50"
                    >
                      {cancellingId === b.id ? "Cancelling…" : "Cancel"}
                    </button>
                  </div>
                </div>

                {reschedulingId === b.id && (
                  <div className="mt-3.5 border-t border-border pt-3.5">
                    <div className="flex gap-1.5 overflow-x-auto pb-1">
                      {rescheduleDates.map((iso, i) => {
                        const { weekday, day } = dateLabel(iso);
                        const active = iso === rescheduleDate;
                        return (
                          <button
                            key={iso}
                            onClick={() => setRescheduleDate(iso)}
                            className={`min-w-[56px] shrink-0 rounded-[9px] border px-3 py-1.5 text-center text-[12px] font-bold transition ${
                              active
                                ? "border-ink bg-ink text-bg"
                                : "border-border bg-surface-2 text-ink-secondary hover:bg-surface"
                            }`}
                          >
                            <span
                              className={`block text-[9.5px] font-semibold uppercase tracking-wide ${
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

                    <div className="mt-3 flex flex-col gap-2">
                      {rescheduleLoading ? (
                        <p className="text-[12.5px] text-muted">Loading&hellip;</p>
                      ) : rescheduleItems.length === 0 ? (
                        <p className="text-[12.5px] text-muted">No classes this day.</p>
                      ) : (
                        rescheduleItems.map((occ) => {
                          const full =
                            statusFor({ capacity: occ.capacity, booked: occ.bookedCount }) ===
                            "critical";
                          const waitlistFull = occ.waitlistCount >= 2;
                          const disabled = full && waitlistFull;
                          return (
                            <div
                              key={occ.occurrenceId}
                              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-2 px-3 py-2.5"
                            >
                              <div className="min-w-0">
                                <div className="text-[13px] font-bold text-ink">
                                  {occ.time} &middot; {occ.name}
                                  {occ.ladiesOnly && (
                                    <span className="ml-2 rounded-full bg-secondary-soft px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-secondary-strong">
                                      Ladies only
                                    </span>
                                  )}
                                </div>
                                <div className="mt-0.5 text-[11.5px] text-muted">
                                  {familyLabel[occ.family]} &middot;{" "}
                                  {spotsLabel({ capacity: occ.capacity, booked: occ.bookedCount })}
                                </div>
                              </div>
                              <button
                                onClick={() => handleReschedulePick(occ.occurrenceId)}
                                disabled={disabled || reschedulingBusy}
                                className="shrink-0 rounded-[9px] bg-accent-strong px-3.5 py-2 text-[12px] font-bold text-accent-ink transition hover:brightness-110 disabled:opacity-50"
                              >
                                {reschedulingBusy
                                  ? "Moving…"
                                  : disabled
                                    ? "Full"
                                    : full
                                      ? "Join waitlist"
                                      : "Move here"}
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <h2 className="mt-7 text-[14.5px] font-bold text-ink">History</h2>
        <div className="mt-2.5 flex flex-col gap-2">
          {past.length === 0 ? (
            <p className="text-[13px] text-muted">No past classes yet.</p>
          ) : (
            past.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface-2 p-3.5"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-semibold text-ink-secondary">{b.name}</div>
                  <div className="mt-0.5 text-[12px] text-muted">
                    {formatDate(b.date)} &middot; {b.time}
                  </div>
                </div>
                <span className="shrink-0 text-[11px] font-bold uppercase tracking-wide text-muted">
                  {statusLabel[b.status] ?? b.status}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
      <Footer />
    </main>
  );
}
