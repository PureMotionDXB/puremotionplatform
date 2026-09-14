"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getErrorMessage } from "@/lib/schedule-data";
import { fetchMyStaffInfo } from "@/lib/admin-db";
import {
  fetchClientSegments,
  segmentLabel,
  waLink,
  type ClientSegment,
  type Segment,
} from "@/lib/segments-db";

const segmentOrder: Segment[] = ["never_attended", "first_timer", "active", "lapsed", "lost"];

const segmentTone: Record<Segment, string> = {
  never_attended: "border-border bg-surface",
  first_timer: "border-accent bg-accent-soft",
  active: "border-status-good bg-status-good-soft",
  lapsed: "border-status-warning bg-status-warning-soft",
  lost: "border-status-critical bg-status-critical-soft",
};

function formatDate(dateStr: string | null) {
  if (!dateStr) return "Never";
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function AdminSegmentsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<ClientSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openSegment, setOpenSegment] = useState<Segment | null>(null);

  useEffect(() => {
    fetchMyStaffInfo().then((info) => {
      if (info?.role === "instructor") router.replace("/admin/roster");
    });
  }, [router]);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setClients(await fetchClientSegments());
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load client segments."));
    } finally {
      setLoading(false);
    }
  }

  const bySegment = useMemo(() => {
    const map = new Map<Segment, ClientSegment[]>();
    for (const seg of segmentOrder) map.set(seg, []);
    for (const c of clients) map.get(c.segment)!.push(c);
    for (const seg of segmentOrder) {
      map.get(seg)!.sort((a, b) => (b.lastAttendedAt ?? "").localeCompare(a.lastAttendedAt ?? ""));
    }
    return map;
  }, [clients]);

  return (
    <main className="flex-1 bg-bg">
      <div className="mx-auto max-w-4xl px-7 py-8">
        <h1 className="font-display text-[23px] font-bold text-ink">Client segments</h1>
        <p className="mt-1 max-w-[560px] text-[13px] text-muted">
          Grouped by how recently each client last attended a class — a starting point for
          reaching out. Automated campaign emails aren&rsquo;t built yet; for now, click a
          segment to get a one-tap WhatsApp or call link per client.
        </p>

        {error && (
          <div className="mt-5 rounded-2xl border border-status-critical bg-status-critical-soft p-4 text-[13px] text-status-critical">
            {error}
          </div>
        )}

        {loading ? (
          <p className="mt-5 text-[13px] text-muted">Loading&hellip;</p>
        ) : (
          <div className="mt-5 flex flex-col gap-3">
            {segmentOrder.map((seg) => {
              const list = bySegment.get(seg) ?? [];
              const open = openSegment === seg;
              return (
                <div key={seg} className={`rounded-2xl border p-4 ${segmentTone[seg]}`}>
                  <button
                    onClick={() => setOpenSegment(open ? null : seg)}
                    className="flex w-full items-center justify-between text-left"
                  >
                    <div>
                      <div className="text-[13.5px] font-bold text-ink">{segmentLabel[seg]}</div>
                      <div className="mt-0.5 text-[12px] text-muted">
                        {list.length} {list.length === 1 ? "client" : "clients"}
                      </div>
                    </div>
                    <span className="text-[12px] font-bold text-ink-secondary">
                      {open ? "Hide" : "Show"}
                    </span>
                  </button>

                  {open && (
                    <div className="mt-3 flex flex-col gap-2 border-t border-border/60 pt-3">
                      {list.length === 0 ? (
                        <p className="text-[12.5px] text-muted">No clients in this segment.</p>
                      ) : (
                        list.map((c) => {
                          const wa = waLink(c.phone);
                          return (
                            <div
                              key={c.id}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface px-3.5 py-2.5"
                            >
                              <div>
                                <div className="text-[13px] font-bold text-ink">
                                  {c.fullName || "—"}
                                </div>
                                <div className="mt-0.5 text-[11.5px] text-muted">
                                  {c.totalAttended} classes attended &middot; last visit{" "}
                                  {formatDate(c.lastAttendedAt)}
                                </div>
                              </div>
                              <div className="flex gap-3">
                                {wa && (
                                  <a
                                    href={wa}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[12px] font-bold text-status-good hover:underline"
                                  >
                                    WhatsApp
                                  </a>
                                )}
                                {c.phone && (
                                  <a
                                    href={`tel:${c.phone.replace(/\s/g, "")}`}
                                    className="text-[12px] font-bold text-accent-strong hover:underline"
                                  >
                                    Call
                                  </a>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
