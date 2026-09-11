"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getErrorMessage, type Instructor } from "@/lib/schedule-data";
import { fetchInstructors, insertInstructor } from "@/lib/schedule-db";
import { fetchMyStaffInfo } from "@/lib/admin-db";

export default function AdminInstructorsPage() {
  const router = useRouter();
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

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
      setInstructors(await fetchInstructors());
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load instructors."));
    } finally {
      setLoading(false);
    }
  }

  async function addInstructor() {
    const name = newName.trim();
    if (!name || adding) return;
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    setAdding(true);
    setError(null);
    try {
      await insertInstructor({ id, name });
      setNewName("");
      await load();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to add the instructor."));
    } finally {
      setAdding(false);
    }
  }

  return (
    <main className="flex-1 bg-bg">
      <div className="mx-auto max-w-3xl px-7 py-8">
        <h1 className="font-display text-[23px] font-bold text-ink">Instructors</h1>
        <p className="mt-1 text-[13px] text-muted">
          Manage instructor profiles, bios, and private records (contact details, ID
          documents, contracts).
        </p>

        {error && (
          <div className="mt-5 rounded-2xl border border-status-critical bg-status-critical-soft p-4 text-[13px] text-status-critical">
            {error}
          </div>
        )}

        <div className="mt-5 flex gap-2">
          <input
            className="field-input max-w-[280px]"
            placeholder="New instructor's name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addInstructor()}
          />
          <button
            onClick={addInstructor}
            disabled={adding || !newName.trim()}
            className="rounded-[9px] bg-accent-strong px-4 py-2.5 text-[13px] font-bold text-accent-ink transition hover:brightness-110 disabled:opacity-50"
          >
            {adding ? "Adding…" : "+ Add instructor"}
          </button>
        </div>

        <div className="mt-5 flex flex-col gap-2">
          {loading ? (
            <p className="text-[13px] text-muted">Loading&hellip;</p>
          ) : instructors.length === 0 ? (
            <p className="text-[13px] text-muted">No instructors yet.</p>
          ) : (
            instructors.map((i) => (
              <Link
                key={i.id}
                href={`/admin/instructors/${i.id}`}
                className="flex items-center justify-between rounded-2xl border border-border bg-surface p-4 transition hover:bg-surface-2"
              >
                <div>
                  <div className="text-[14px] font-bold text-ink">{i.name}</div>
                  {!i.bio && (
                    <div className="mt-0.5 text-[11.5px] text-muted">No bio yet</div>
                  )}
                </div>
                <span className="text-[12px] font-bold text-accent-strong">Manage &rarr;</span>
              </Link>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
