"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ClassCard } from "@/components/ClassCard";
import { firstName, getErrorMessage, statusFor, type Instructor } from "@/lib/schedule-data";
import { fetchInstructors } from "@/lib/schedule-db";
import {
  bookClass,
  cancelBooking,
  ensureOccurrences,
  fetchMyClient,
  fetchOccurrences,
  type OccurrenceView,
} from "@/lib/booking-db";

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

type FamilyFilter = "all" | "reformer" | "mat";

export default function SchedulePage() {
  return (
    <Suspense fallback={null}>
      <ScheduleContent />
    </Suspense>
  );
}

function ScheduleContent() {
  const searchParams = useSearchParams();
  const initialFamily = searchParams.get("family");

  const dates = useMemo(() => {
    const today = new Date();
    return Array.from({ length: DAYS_AHEAD }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      return toISODate(d);
    });
  }, []);

  const [selectedDate, setSelectedDate] = useState(dates[0]);
  const [filter, setFilter] = useState<FamilyFilter>(
    initialFamily === "reformer" || initialFamily === "mat" ? initialFamily : "all",
  );
  const [occurrences, setOccurrences] = useState<OccurrenceView[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [signedIn, setSignedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      await ensureOccurrences();
      const [occurrenceData, instructorData, client] = await Promise.all([
        fetchOccurrences(dates[0], dates[dates.length - 1]),
        fetchInstructors(),
        fetchMyClient(),
      ]);
      setOccurrences(occurrenceData);
      setInstructors(instructorData);
      setSignedIn(client !== null);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load the schedule."));
    } finally {
      setLoading(false);
    }
  }

  const instructorName = useMemo(
    () => new Map(instructors.map((i) => [i.id, firstName(i.name)])),
    [instructors],
  );

  const items = useMemo(
    () =>
      occurrences
        .filter((o) => o.date === selectedDate && (filter === "all" || o.family === filter))
        .sort((a, b) => a.time.localeCompare(b.time)),
    [occurrences, selectedDate, filter],
  );

  async function handleBook(occurrenceId: string) {
    setBusyId(occurrenceId);
    setError(null);
    try {
      await bookClass(occurrenceId);
      const [occurrenceData, client] = await Promise.all([
        fetchOccurrences(dates[0], dates[dates.length - 1]),
        fetchMyClient(),
      ]);
      setOccurrences(occurrenceData);
      setSignedIn(client !== null);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to book this class."));
    } finally {
      setBusyId(null);
    }
  }

  async function handleCancel(bookingId: string, occurrenceId: string) {
    if (!confirm("Cancel this booking?")) return;
    setBusyId(occurrenceId);
    setError(null);
    try {
      await cancelBooking(bookingId);
      const occurrenceData = await fetchOccurrences(dates[0], dates[dates.length - 1]);
      setOccurrences(occurrenceData);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to cancel."));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="flex-1 bg-bg">
      <div className="mx-auto max-w-6xl px-7 py-8">
        <div className="mb-1 flex items-center justify-between gap-3">
          <Link href="/" className="text-[13px] font-semibold text-muted hover:text-ink">
            &larr; Pure Motion
          </Link>
          {signedIn ? (
            <Link href="/account" className="text-[13px] font-semibold text-muted hover:text-ink">
              My account
            </Link>
          ) : (
            <Link
              href="/account/login"
              className="text-[13px] font-semibold text-accent-strong hover:underline"
            >
              Sign in
            </Link>
          )}
        </div>
        <h1 className="font-display text-[23px] font-bold text-ink">Book a class</h1>
        <p className="mt-1 text-[13px] text-muted">
          Reformer beds fill up fast — grab your spot ahead of time.
        </p>

        {error && (
          <div className="mt-5 rounded-2xl border border-status-critical bg-status-critical-soft p-4 text-[13px] text-status-critical">
            {error}
          </div>
        )}

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

        <div className="mt-4 flex max-w-[340px] gap-1.5 rounded-xl bg-surface-2 p-1">
          {(
            [
              ["all", "All classes"],
              ["reformer", "Reformer"],
              ["mat", "Mat"],
            ] as [FamilyFilter, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`flex-1 rounded-[9px] px-2.5 py-2 text-[13px] font-bold transition ${
                filter === value
                  ? "bg-surface text-ink shadow-sm"
                  : "text-ink-secondary hover:text-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-5 flex flex-col gap-2.5">
          {loading ? (
            <div className="rounded-2xl border border-border bg-surface p-5 text-center text-[13px] text-muted">
              Loading schedule&hellip;
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-2xl border border-border bg-surface p-5 text-center text-[13px] text-muted">
              No {filter === "all" ? "" : `${filter} `}classes scheduled this day.
            </div>
          ) : (
            items.map((occ) => {
              const full = statusFor({ capacity: occ.capacity, booked: occ.bookedCount }) === "critical";
              const waitlistFull = occ.waitlistCount >= 2;
              const busy = busyId === occ.occurrenceId;

              let action;
              if (occ.myStatus === "booked") {
                action = (
                  <button
                    onClick={() => occ.myBookingId && handleCancel(occ.myBookingId, occ.occurrenceId)}
                    disabled={busy}
                    className="w-full shrink-0 rounded-[9px] border border-status-critical px-4 py-2 text-[13px] font-bold text-status-critical transition hover:bg-status-critical-soft disabled:opacity-50 sm:w-auto"
                  >
                    {busy ? "Cancelling…" : "Booked · Cancel"}
                  </button>
                );
              } else if (occ.myStatus === "waitlisted") {
                action = (
                  <button
                    onClick={() => occ.myBookingId && handleCancel(occ.myBookingId, occ.occurrenceId)}
                    disabled={busy}
                    className="w-full shrink-0 rounded-[9px] border border-status-warning px-4 py-2 text-[13px] font-bold text-status-warning transition hover:bg-status-warning-soft disabled:opacity-50 sm:w-auto"
                  >
                    {busy ? "Cancelling…" : "Waitlisted · Cancel"}
                  </button>
                );
              } else if (!signedIn) {
                action = (
                  <Link
                    href="/account/login"
                    className="w-full shrink-0 rounded-[9px] bg-accent-strong px-4 py-2 text-center text-[13px] font-bold text-accent-ink transition hover:brightness-110 sm:w-auto"
                  >
                    Sign in to book
                  </Link>
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
      </div>
    </main>
  );
}
