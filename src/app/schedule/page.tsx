"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ClassCard } from "@/components/ClassCard";
import {
  DAYS,
  firstName,
  statusFor,
  type Instructor,
  type ScheduledClass,
} from "@/lib/schedule-data";
import { fetchClasses, fetchInstructors } from "@/lib/schedule-db";

const TODAY = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;

type FamilyFilter = "all" | "reformer" | "mat";

export default function SchedulePage() {
  const [day, setDay] = useState(TODAY);
  const [filter, setFilter] = useState<FamilyFilter>("all");
  const [classes, setClasses] = useState<ScheduledClass[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchClasses(), fetchInstructors()])
      .then(([classesData, instructorsData]) => {
        if (cancelled) return;
        setClasses(classesData);
        setInstructors(instructorsData);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load the schedule.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const instructorName = useMemo(
    () => new Map(instructors.map((i) => [i.id, firstName(i.name)])),
    [instructors],
  );

  const items = useMemo(
    () =>
      classes
        .filter((c) => c.day === day && (filter === "all" || c.family === filter))
        .sort((a, b) => a.time.localeCompare(b.time)),
    [classes, day, filter],
  );

  return (
    <main className="flex-1 bg-bg">
      <div className="mx-auto max-w-6xl px-7 py-8">
        <div className="mb-1 flex items-center gap-3">
          <Link href="/" className="text-[13px] font-semibold text-muted hover:text-ink">
            &larr; Pure Motion
          </Link>
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

        <div className="mt-5 flex flex-wrap gap-1.5">
          {DAYS.map((label, i) => {
            const count = classes.filter((c) => c.day === i).length;
            const active = i === day;
            return (
              <button
                key={label}
                onClick={() => setDay(i)}
                className={`min-w-[64px] rounded-[10px] border px-3.5 py-2 text-center text-[12.5px] font-bold transition ${
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
                  {label}
                </span>
                {i === TODAY ? "Today" : `${count} cls`}
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
              No {filter === "all" ? "" : `${filter} `}classes scheduled today.
            </div>
          ) : (
            items.map((cls) => {
              const full = statusFor(cls) === "critical";
              return (
                <ClassCard
                  key={cls.id}
                  cls={cls}
                  instructorName={instructorName.get(cls.instructor) ?? cls.instructor}
                  action={
                    <button
                      className={`ml-2 shrink-0 rounded-[9px] px-4 py-2 text-[13px] font-bold transition ${
                        full
                          ? "border border-border-strong text-ink hover:bg-surface-2"
                          : "bg-accent-strong text-accent-ink hover:brightness-110"
                      }`}
                    >
                      {full ? "Join waitlist" : "Book"}
                    </button>
                  }
                />
              );
            })
          )}
        </div>
      </div>
    </main>
  );
}
