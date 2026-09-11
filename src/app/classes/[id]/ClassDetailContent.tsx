"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DAYS, getErrorMessage } from "@/lib/schedule-data";
import { fetchClassDetail, type ClassDetail } from "@/lib/schedule-db";

const familyLabel: Record<string, string> = { reformer: "Reformer", mat: "Mat" };

export function ClassDetailContent({ id }: { id: string }) {
  const [cls, setCls] = useState<ClassDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchClassDetail(id)
      .then(setCls)
      .catch((err) => setError(getErrorMessage(err, "Failed to load this class.")))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <main className="flex-1 bg-bg">
      <div className="mx-auto max-w-2xl px-7 py-8">
        <Link href="/schedule" className="text-[13px] font-semibold text-muted hover:text-ink">
          &larr; Schedule
        </Link>

        {loading ? (
          <p className="mt-5 text-[13px] text-muted">Loading&hellip;</p>
        ) : error ? (
          <div className="mt-5 rounded-2xl border border-status-critical bg-status-critical-soft p-4 text-[13px] text-status-critical">
            {error}
          </div>
        ) : !cls ? (
          <div className="mt-5 rounded-2xl border border-border bg-surface p-5 text-center text-[13px] text-muted">
            This class couldn&rsquo;t be found.
          </div>
        ) : (
          <>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <h1 className="font-display text-[24px] font-bold text-ink">{cls.name}</h1>
              {cls.ladiesOnly && (
                <span className="rounded-full bg-secondary-soft px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-secondary-strong">
                  Ladies only
                </span>
              )}
            </div>
            <p className="mt-1.5 text-[13px] text-muted">
              {familyLabel[cls.family]} &middot; Every {DAYS[cls.day]} at {cls.time} &middot;{" "}
              {cls.capacity} spots
            </p>

            {cls.description && (
              <p className="mt-5 text-[14px] leading-relaxed text-ink-secondary">
                {cls.description}
              </p>
            )}

            <div className="mt-6 rounded-2xl border border-border bg-surface p-5">
              <span className="text-[11px] font-bold uppercase tracking-wide text-muted">
                Instructor
              </span>
              <h2 className="mt-1 font-display text-[16px] font-bold text-ink">
                {cls.instructorName}
              </h2>
              {cls.instructorBio && (
                <p className="mt-2 text-[13.5px] leading-relaxed text-ink-secondary">
                  {cls.instructorBio}
                </p>
              )}
            </div>

            <Link
              href={`/schedule?family=${cls.family}`}
              className="mt-6 inline-block rounded-[9px] bg-accent-strong px-4 py-2.5 text-[13px] font-bold text-accent-ink transition hover:brightness-110"
            >
              View on the schedule
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
