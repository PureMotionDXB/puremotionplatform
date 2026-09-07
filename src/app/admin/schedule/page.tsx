"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { DAYS, emptyClass, type Instructor, type ScheduledClass } from "@/lib/schedule-data";
import {
  deleteClass,
  fetchClasses,
  fetchInstructors,
  insertClass,
  insertInstructor,
  updateClass,
} from "@/lib/schedule-db";

type FormState = Omit<ScheduledClass, "id">;

const familyLabel: Record<string, string> = { reformer: "Reformer", mat: "Mat" };
const familyBadge: Record<string, string> = {
  reformer: "bg-family-reformer/15 text-family-reformer",
  mat: "bg-family-mat/15 text-family-mat",
};

export default function AdminSchedulePage() {
  const [classes, setClasses] = useState<ScheduledClass[]>([]);
  const [instructorRoster, setInstructorRoster] = useState<Instructor[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [newInstructorName, setNewInstructorName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    load();
    return () => {
      cancelled = true;
    };
    function load() {
      Promise.all([fetchClasses(), fetchInstructors()])
        .then(([classesData, instructorsData]) => {
          if (cancelled) return;
          setClasses(classesData);
          setInstructorRoster(instructorsData);
        })
        .catch((err) => {
          if (cancelled) return;
          setError(err instanceof Error ? err.message : "Failed to load the schedule.");
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }
  }, []);

  function startAdd() {
    setEditingId("__new__");
    setForm(emptyClass(instructorRoster[0]?.id ?? ""));
  }

  function startEdit(cls: ScheduledClass) {
    setEditingId(cls.id);
    const { id: _id, ...rest } = cls;
    void _id;
    setForm(rest);
  }

  function cancelForm() {
    setEditingId(null);
    setForm(null);
  }

  async function saveForm() {
    if (!form || !form.name.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      if (editingId === "__new__") {
        const created = await insertClass(form);
        setClasses((prev) => [...prev, created]);
      } else if (editingId) {
        await updateClass(editingId, form);
        setClasses((prev) =>
          prev.map((c) => (c.id === editingId ? { ...form, id: editingId } : c)),
        );
      }
      cancelForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save the class.");
    } finally {
      setSaving(false);
    }
  }

  async function removeClass(id: string) {
    if (!confirm("Remove this class from the schedule?")) return;
    setError(null);
    const prev = classes;
    setClasses((cur) => cur.filter((c) => c.id !== id));
    try {
      await deleteClass(id);
    } catch (err) {
      setClasses(prev);
      setError(err instanceof Error ? err.message : "Failed to remove the class.");
    }
  }

  async function addInstructor() {
    const name = newInstructorName.trim();
    if (!name) return;
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    setError(null);
    try {
      await insertInstructor({ id, name });
      setInstructorRoster((prev) => [...prev, { id, name }]);
      setNewInstructorName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add the instructor.");
    }
  }

  const grouped = DAYS.map((label, dayIndex) => ({
    label,
    dayIndex,
    items: classes
      .filter((c) => c.day === dayIndex)
      .sort((a, b) => a.time.localeCompare(b.time)),
  }));

  return (
    <main className="flex-1 bg-bg">
      <div className="mx-auto max-w-5xl px-7 py-8">
        <Link href="/" className="text-[13px] font-semibold text-muted hover:text-ink">
          &larr; Pure Motion
        </Link>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-[23px] font-bold text-ink">
              Manage schedule
            </h1>
            <p className="mt-1 text-[13px] text-muted">
              Add, edit, or remove classes — changes here update what clients see.
            </p>
          </div>
          <button
            onClick={startAdd}
            disabled={loading}
            className="rounded-[9px] bg-accent-strong px-4 py-2.5 text-[13px] font-bold text-accent-ink transition hover:brightness-110 disabled:opacity-50"
          >
            + Add class
          </button>
        </div>

        {error && (
          <div className="mt-5 rounded-2xl border border-status-critical bg-status-critical-soft p-4 text-[13px] text-status-critical">
            {error}
          </div>
        )}

        {editingId && form && (
          <div className="mt-5 rounded-2xl border-2 border-accent bg-surface p-5">
            <h3 className="mb-3 text-[14.5px] font-bold text-ink">
              {editingId === "__new__" ? "Add a class" : "Edit class"}
            </h3>
            <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3">
              <Field label="Class name">
                <input
                  className="field-input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Reformer Intermediate"
                />
              </Field>
              <Field label="Category">
                <select
                  className="field-input"
                  value={form.family}
                  onChange={(e) =>
                    setForm({ ...form, family: e.target.value as "reformer" | "mat" })
                  }
                >
                  <option value="reformer">Reformer</option>
                  <option value="mat">Mat</option>
                </select>
              </Field>
              <Field label="Credits per booking">
                <input
                  type="number"
                  min={1}
                  className="field-input"
                  value={form.creditCost}
                  onChange={(e) =>
                    setForm({ ...form, creditCost: Number(e.target.value) || 1 })
                  }
                />
              </Field>
              <Field label="Day">
                <select
                  className="field-input"
                  value={form.day}
                  onChange={(e) => setForm({ ...form, day: Number(e.target.value) })}
                >
                  {DAYS.map((d, i) => (
                    <option key={d} value={i}>
                      {d}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Time">
                <input
                  type="time"
                  className="field-input"
                  value={form.time}
                  onChange={(e) => setForm({ ...form, time: e.target.value })}
                />
              </Field>
              <Field label="Instructor">
                <select
                  className="field-input"
                  value={form.instructor}
                  onChange={(e) => setForm({ ...form, instructor: e.target.value })}
                >
                  {instructorRoster.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Capacity">
                <input
                  type="number"
                  min={1}
                  className="field-input"
                  value={form.capacity}
                  onChange={(e) =>
                    setForm({ ...form, capacity: Number(e.target.value) || 1 })
                  }
                />
              </Field>
              <Field label="Already booked (seed)">
                <input
                  type="number"
                  min={0}
                  className="field-input"
                  value={form.booked}
                  onChange={(e) =>
                    setForm({ ...form, booked: Number(e.target.value) || 0 })
                  }
                />
              </Field>
            </div>
            <div className="mt-4 flex gap-2.5">
              <button
                onClick={saveForm}
                disabled={saving}
                className="rounded-[9px] bg-accent-strong px-4 py-2.5 text-[13px] font-bold text-accent-ink hover:brightness-110 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save class"}
              </button>
              <button
                onClick={cancelForm}
                className="rounded-[9px] border border-border-strong px-4 py-2.5 text-[13px] font-bold text-ink hover:bg-surface-2"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="mt-6 rounded-2xl border border-border bg-surface p-5">
          <h3 className="mb-3 text-[14.5px] font-bold text-ink">Instructors</h3>
          <div className="flex flex-wrap gap-2">
            {instructorRoster.map((i) => (
              <span
                key={i.id}
                className="rounded-full border border-border bg-surface-2 px-3 py-1.5 text-[12.5px] font-semibold text-ink-secondary"
              >
                {i.name}
              </span>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <input
              className="field-input max-w-[220px]"
              placeholder="Add instructor name"
              value={newInstructorName}
              onChange={(e) => setNewInstructorName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addInstructor()}
            />
            <button
              onClick={addInstructor}
              className="rounded-[9px] border border-border-strong px-3.5 py-2 text-[12.5px] font-bold text-ink hover:bg-surface-2"
            >
              Add
            </button>
          </div>
        </div>

        <div className="mt-6 space-y-6">
          {loading ? (
            <p className="text-[13px] text-muted">Loading schedule&hellip;</p>
          ) : (
            grouped.map((group) => (
              <div key={group.label}>
                <h3 className="mb-2 text-[12px] font-bold uppercase tracking-wide text-muted">
                  {group.label}
                </h3>
                {group.items.length === 0 ? (
                  <p className="text-[12.5px] text-muted">No classes.</p>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
                    <table className="w-full text-[13px]">
                      <thead>
                        <tr className="border-b border-border text-left text-[11px] font-bold uppercase tracking-wide text-muted">
                          <th className="px-3 py-2.5">Time</th>
                          <th className="px-3 py-2.5">Class</th>
                          <th className="px-3 py-2.5">Category</th>
                          <th className="px-3 py-2.5">Credits</th>
                          <th className="px-3 py-2.5">Instructor</th>
                          <th className="px-3 py-2.5">Capacity</th>
                          <th className="px-3 py-2.5"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.items.map((c) => (
                          <tr key={c.id} className="border-b border-border last:border-none">
                            <td className="px-3 py-2.5 font-mono">{c.time}</td>
                            <td className="px-3 py-2.5 font-semibold">{c.name}</td>
                            <td className="px-3 py-2.5">
                              <span
                                className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${familyBadge[c.family]}`}
                              >
                                {familyLabel[c.family]}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 font-mono">{c.creditCost}</td>
                            <td className="px-3 py-2.5 text-ink-secondary">
                              {instructorRoster.find((i) => i.id === c.instructor)?.name ??
                                c.instructor}
                            </td>
                            <td className="px-3 py-2.5 font-mono">
                              {c.booked}/{c.capacity}
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              <button
                                onClick={() => startEdit(c)}
                                className="mr-2 text-[12px] font-bold text-accent-strong hover:underline"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => removeClass(c.id)}
                                className="text-[12px] font-bold text-status-critical hover:underline"
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <p className="mt-8 text-[11.5px] text-muted">
          Changes here save to the live database immediately and show up for clients
          right away.
        </p>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-bold uppercase tracking-wide text-muted">
        {label}
      </span>
      {children}
    </label>
  );
}
