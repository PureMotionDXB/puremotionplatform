"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { getErrorMessage } from "@/lib/schedule-data";
import { emptyCategory, type ServiceCategory } from "@/lib/categories-data";
import { fetchCategories, insertCategory, updateCategory } from "@/lib/categories-db";
import { fetchMyStaffInfo } from "@/lib/admin-db";

export default function AdminCategoriesPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ServiceCategory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchMyStaffInfo().then((info) => {
      if (info?.role === "instructor") router.replace("/admin/roster");
    });
  }, [router]);

  useEffect(() => {
    fetchCategories()
      .then(setCategories)
      .catch((err) => setError(getErrorMessage(err, "Failed to load categories.")))
      .finally(() => setLoading(false));
  }, []);

  function startAdd() {
    setEditingId("__new__");
    setForm(emptyCategory());
  }

  function startEdit(cat: ServiceCategory) {
    setEditingId(cat.id);
    setForm(cat);
  }

  function cancelForm() {
    setEditingId(null);
    setForm(null);
  }

  async function saveForm() {
    if (!form || !form.id.trim() || !form.name.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      if (editingId === "__new__") {
        const created = await insertCategory({ ...form, id: form.id.trim() });
        setCategories((prev) => [...prev, created]);
      } else if (editingId) {
        await updateCategory(editingId, {
          name: form.name,
          color: form.color,
          displayOrder: form.displayOrder,
        });
        setCategories((prev) => prev.map((c) => (c.id === editingId ? form : c)));
      }
      cancelForm();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to save the category."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="flex-1 bg-bg">
      <div className="mx-auto max-w-4xl px-7 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-[23px] font-bold text-ink">Categories</h1>
            <p className="mt-1 text-[13px] text-muted">
              The payment/class categories (Reformer, Mat, and any others) that classes and
              packages are organized under.
            </p>
          </div>
          <button
            onClick={startAdd}
            disabled={loading}
            className="rounded-[9px] bg-accent-strong px-4 py-2.5 text-[13px] font-bold text-accent-ink transition hover:brightness-110 disabled:opacity-50"
          >
            + Add category
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
              {editingId === "__new__" ? "Add a category" : "Edit category"}
            </h3>
            <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3">
              <Field label="Slug (id)">
                <input
                  className="field-input disabled:opacity-50"
                  value={form.id}
                  disabled={editingId !== "__new__"}
                  onChange={(e) =>
                    setForm({ ...form, id: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "") })
                  }
                  placeholder="e.g. yoga"
                />
              </Field>
              <Field label="Name">
                <input
                  className="field-input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Yoga"
                />
              </Field>
              <Field label="Color (optional)">
                <input
                  className="field-input"
                  value={form.color ?? ""}
                  onChange={(e) => setForm({ ...form, color: e.target.value || null })}
                  placeholder="e.g. #3b82f6"
                />
              </Field>
              <Field label="Display order">
                <input
                  type="number"
                  className="field-input"
                  value={form.displayOrder}
                  onChange={(e) => setForm({ ...form, displayOrder: Number(e.target.value) || 0 })}
                />
              </Field>
            </div>
            <p className="mt-3 text-[11.5px] text-muted">
              The slug can&apos;t be changed after creation — it&apos;s referenced by classes,
              bookings, and packages.
            </p>
            <div className="mt-4 flex gap-2.5">
              <button
                onClick={saveForm}
                disabled={saving}
                className="rounded-[9px] bg-accent-strong px-4 py-2.5 text-[13px] font-bold text-accent-ink hover:brightness-110 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save category"}
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

        <div className="mt-6">
          {loading ? (
            <p className="text-[13px] text-muted">Loading categories&hellip;</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] font-bold uppercase tracking-wide text-muted">
                    <th className="px-3 py-2.5">Slug</th>
                    <th className="px-3 py-2.5">Name</th>
                    <th className="px-3 py-2.5">Color</th>
                    <th className="px-3 py-2.5">Order</th>
                    <th className="px-3 py-2.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((c) => (
                    <tr key={c.id} className="border-b border-border last:border-none">
                      <td className="px-3 py-2.5 font-mono">{c.id}</td>
                      <td className="px-3 py-2.5 font-semibold">{c.name}</td>
                      <td className="px-3 py-2.5 text-ink-secondary">{c.color ?? "—"}</td>
                      <td className="px-3 py-2.5 font-mono">{c.displayOrder}</td>
                      <td className="px-3 py-2.5 text-right">
                        <button
                          onClick={() => startEdit(c)}
                          className="text-[12px] font-bold text-accent-strong hover:underline"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-bold uppercase tracking-wide text-muted">{label}</span>
      {children}
    </label>
  );
}
