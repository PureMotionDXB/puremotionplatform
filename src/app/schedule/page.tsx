"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ClassCard } from "@/components/ClassCard";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { firstName, getErrorMessage, statusFor, type Instructor } from "@/lib/schedule-data";
import { fetchInstructors } from "@/lib/schedule-db";
import {
  bookClass,
  cancelBooking,
  ensureOccurrences,
  fetchMyClient,
  fetchMyMemberships,
  fetchOccurrences,
  type ClientProfile,
  type MyMembership,
  type OccurrenceView,
} from "@/lib/booking-db";
import { fetchSingleClassPrices } from "@/lib/packages-db";

function formatAed(priceAed: number): string {
  return `AED ${Math.round(priceAed).toLocaleString()}`;
}

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
  const [client, setClient] = useState<ClientProfile | null>(null);
  const [memberships, setMemberships] = useState<MyMembership[]>([]);
  const [singleClassPrices, setSingleClassPrices] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [justBooked, setJustBooked] = useState(searchParams.get("booked") === "success");

  const signedIn = client !== null;

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      await ensureOccurrences();
      const [occurrenceData, instructorData, clientData, membershipData, priceData] = await Promise.all([
        fetchOccurrences(dates[0], dates[dates.length - 1]),
        fetchInstructors(),
        fetchMyClient(),
        fetchMyMemberships(),
        fetchSingleClassPrices(),
      ]);
      setOccurrences(occurrenceData);
      setInstructors(instructorData);
      setClient(clientData);
      setMemberships(membershipData);
      setSingleClassPrices(priceData);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load the schedule."));
    } finally {
      setLoading(false);
    }
  }

  function canBookFree(family: "reformer" | "mat"): boolean {
    if (!client) return false;
    if (memberships.some((m) => m.family === family)) return true;
    const credits = family === "reformer" ? client.reformerCredits : client.matCredits;
    return credits >= 1;
  }

  async function handlePayAndBook(occurrenceId: string) {
    setBusyId(occurrenceId);
    setError(null);
    try {
      const res = await fetch("/api/checkout/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ occurrenceId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to start checkout");
      window.location.href = data.url;
    } catch (err) {
      setError(getErrorMessage(err, "Failed to start checkout."));
      setBusyId(null);
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
      const [occurrenceData, clientData] = await Promise.all([
        fetchOccurrences(dates[0], dates[dates.length - 1]),
        fetchMyClient(),
      ]);
      setOccurrences(occurrenceData);
      setClient(clientData);
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
      <Header />
      <div className="mx-auto max-w-6xl px-7 py-8">
        <h1 className="font-display text-[23px] font-bold text-ink">Book a class</h1>
        <p className="mt-1 text-[13px] text-muted">
          Reformer beds fill up fast — grab your spot ahead of time.
        </p>

        {justBooked && (
          <div className="mt-5 flex items-center justify-between rounded-2xl border border-status-good bg-status-good-soft p-4 text-[13px] text-status-good">
            <span>Payment received — you&apos;re booked in.</span>
            <button onClick={() => setJustBooked(false)} className="font-bold hover:underline">
              Dismiss
            </button>
          </div>
        )}

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
              } else if (!canBookFree(occ.family) && singleClassPrices[occ.family] != null) {
                action = (
                  <button
                    onClick={() => handlePayAndBook(occ.occurrenceId)}
                    disabled={busy}
                    className="w-full shrink-0 rounded-[9px] bg-accent-strong px-4 py-2 text-[13px] font-bold text-accent-ink transition hover:brightness-110 disabled:opacity-50 sm:w-auto"
                  >
                    {busy
                      ? "Redirecting…"
                      : `Pay ${formatAed(singleClassPrices[occ.family])} & ${full ? "join waitlist" : "book"}`}
                  </button>
                );
              } else if (!canBookFree(occ.family)) {
                action = (
                  <button
                    disabled
                    className="w-full shrink-0 rounded-[9px] border border-border-strong px-4 py-2 text-[13px] font-bold text-muted opacity-60 sm:w-auto"
                  >
                    Not available for purchase
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
                  detailHref={`/classes/${occ.classId}`}
                />
              );
            })
          )}
        </div>
      </div>
      <Footer />
    </main>
  );
}
