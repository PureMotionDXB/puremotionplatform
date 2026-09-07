"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getErrorMessage } from "@/lib/schedule-data";
import {
  cancelBooking,
  fetchMyBookings,
  fetchMyClient,
  type ClientProfile,
  type MyBooking,
} from "@/lib/booking-db";

const familyLabel: Record<string, string> = { reformer: "Reformer", mat: "Mat" };

function formatDate(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default function AccountPage() {
  const router = useRouter();
  const [client, setClient] = useState<ClientProfile | null>(null);
  const [bookings, setBookings] = useState<MyBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

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
  const past = bookings.filter((b) => b.status === "cancelled" || b.status === "attended");

  return (
    <main className="flex-1 bg-bg">
      <div className="mx-auto max-w-3xl px-7 py-8">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-[13px] font-semibold text-muted hover:text-ink">
            &larr; Pure Motion
          </Link>
          <button
            onClick={logOut}
            className="text-[12px] font-bold text-status-critical hover:underline"
          >
            Log out
          </button>
        </div>

        <h1 className="mt-2 font-display text-[23px] font-bold text-ink">
          {client.fullName ? `Hi, ${client.fullName.split(" ")[0]}` : "My account"}
        </h1>

        {error && (
          <div className="mt-4 rounded-2xl border border-status-critical bg-status-critical-soft p-4 text-[13px] text-status-critical">
            {error}
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
                className="flex items-center justify-between rounded-2xl border border-border bg-surface p-3.5"
              >
                <div>
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
                <button
                  onClick={() => handleCancel(b.id)}
                  disabled={cancellingId === b.id}
                  className="text-[12px] font-bold text-status-critical hover:underline disabled:opacity-50"
                >
                  {cancellingId === b.id ? "Cancelling…" : "Cancel"}
                </button>
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
                className="flex items-center justify-between rounded-2xl border border-border bg-surface-2 p-3.5"
              >
                <div>
                  <div className="text-[14px] font-semibold text-ink-secondary">{b.name}</div>
                  <div className="mt-0.5 text-[12px] text-muted">
                    {formatDate(b.date)} &middot; {b.time}
                  </div>
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wide text-muted">
                  {b.status}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
