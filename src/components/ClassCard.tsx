import type { ReactNode } from "react";
import { statusFor, statusLabel, type ClassFamily } from "@/lib/schedule-data";

interface CardClass {
  time: string;
  name: string;
  family: ClassFamily;
  ladiesOnly: boolean;
  capacity: number;
  booked: number;
}

const familyColor: Record<string, string> = {
  reformer: "var(--family-reformer)",
  mat: "var(--family-mat)",
};

const familyLabel: Record<string, string> = {
  reformer: "Reformer",
  mat: "Mat",
};

const statusChipClass: Record<string, string> = {
  good: "bg-status-good-soft text-status-good",
  warning: "bg-status-warning-soft text-status-warning",
  critical: "bg-status-critical-soft text-status-critical",
};

const statusBarClass: Record<string, string> = {
  good: "bg-status-good",
  warning: "bg-status-warning",
  critical: "bg-status-critical",
};

export function ClassCard({
  cls,
  instructorName,
  action,
}: {
  cls: CardClass;
  instructorName: string;
  action?: ReactNode;
}) {
  const status = statusFor(cls);
  const pct = Math.round((cls.booked / cls.capacity) * 100);

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-3.5">
      <div className="w-[58px] shrink-0 font-mono text-[14.5px] font-semibold text-ink">
        {cls.time}
      </div>
      <span
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ background: familyColor[cls.family] }}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <div className="text-[14.5px] font-bold text-ink">{cls.name}</div>
          {cls.ladiesOnly && (
            <span className="shrink-0 rounded-full bg-secondary-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-secondary-strong">
              Ladies only
            </span>
          )}
        </div>
        <div className="mt-0.5 text-[12px] text-muted">
          {instructorName ? `${instructorName} · ` : ""}
          {familyLabel[cls.family]}
        </div>
      </div>
      <div className="w-[150px] shrink-0">
        <div className="mb-1.5 flex justify-between text-[11.5px]">
          <span
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${statusChipClass[status]}`}
          >
            {statusLabel(cls)}
          </span>
          <b className="font-mono font-semibold">
            {cls.booked}/{cls.capacity}
          </b>
        </div>
        <div className="h-[5px] overflow-hidden rounded-full bg-surface-2">
          <div
            className={`h-full rounded-full ${statusBarClass[status]}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      {action}
    </div>
  );
}
