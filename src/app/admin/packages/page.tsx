"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { getErrorMessage } from "@/lib/schedule-data";
import { emptyPackage, type DisplayTab, type Package, type PackageKind } from "@/lib/packages-data";
import { createPackage, changePackagePrice, fetchAllPackages, updatePackage } from "@/lib/packages-db";
import { fetchCategories } from "@/lib/categories-db";
import type { ServiceCategory } from "@/lib/categories-data";
import { fetchMyStaffInfo } from "@/lib/admin-db";

type FormState = Omit<Package, "id" | "stripeProductId" | "stripePriceId">;

function formatAed(priceAed: number): string {
  return `AED ${Math.round(priceAed).toLocaleString()}`;
}

export default function AdminPackagesPage() {
  const router = useRouter();
  const [packages, setPackages] = useState<Package[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [originalPrice, setOriginalPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchMyStaffInfo().then((info) => {
      if (info?.role === "instructor") router.replace("/admin/roster");
    });
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchAllPackages(), fetchCategories()])
      .then(([packageData, categoryData]) => {
        if (cancelled) return;
        setPackages(packageData);
        setCategories(categoryData);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(getErrorMessage(err, "Failed to load packages."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function startAdd() {
    setEditingId("__new__");
    setForm(emptyPackage(categories[0]?.id ?? ""));
    setOriginalPrice(null);
  }

  function startEdit(pkg: Package) {
    setEditingId(pkg.id);
    const { id: _id, stripeProductId: _spi, stripePriceId: _sprid, ...rest } = pkg;
    void _id;
    void _spi;
    void _sprid;
    setForm(rest);
    setOriginalPrice(pkg.priceAed);
  }

  function cancelForm() {
    setEditingId(null);
    setForm(null);
    setOriginalPrice(null);
  }

  async function saveForm() {
    if (!form || !form.name.trim() || !form.family || saving) return;
    setSaving(true);
    setError(null);
    try {
      if (editingId === "__new__") {
        const created = await createPackage({
          name: form.name.trim(),
          family: form.family,
          kind: form.kind,
          creditAmount: form.kind === "credits" ? form.creditAmount : null,
          durationDays: form.kind === "membership" ? form.durationDays : null,
          durationMonths: form.kind === "membership" ? form.durationMonths : null,
          priceAed: form.priceAed,
          displayTab: form.displayTab,
          displayOrder: form.displayOrder,
          detail: form.detail,
          note: form.note,
          singleClass: form.singleClass,
        });
        setPackages((prev) => [...prev, created]);
      } else if (editingId) {
        let updated = await updatePackage(editingId, {
          name: form.name.trim(),
          family: form.family,
          displayTab: form.displayTab,
          displayOrder: form.displayOrder,
          detail: form.detail,
          note: form.note,
          singleClass: form.singleClass,
          active: form.active,
        });
        if (originalPrice !== null && form.priceAed !== originalPrice) {
          updated = await changePackagePrice(editingId, form.priceAed);
        }
        setPackages((prev) => prev.map((p) => (p.id === editingId ? updated : p)));
      }
      cancelForm();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to save the package."));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(pkg: Package) {
    setError(null);
    try {
      const updated = await updatePackage(pkg.id, { active: !pkg.active });
      setPackages((prev) => prev.map((p) => (p.id === pkg.id ? updated : p)));
    } catch (err) {
      setError(getErrorMessage(err, "Failed to update the package."));
    }
  }

  const categoryName = new Map(categories.map((c) => [c.id, c.name]));
  const canSingleClass = !!form && form.kind === "credits" && form.creditAmount === 1;

  return (
    <main className="flex-1 bg-bg">
      <div className="mx-auto max-w-5xl px-7 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-[23px] font-bold text-ink">Pricing</h1>
            <p className="mt-1 text-[13px] text-muted">
              Packages clients can buy — creating or repricing one here creates real Stripe
              products/prices automatically.
            </p>
          </div>
          <button
            onClick={startAdd}
            disabled={loading || categories.length === 0}
            className="rounded-[9px] bg-accent-strong px-4 py-2.5 text-[13px] font-bold text-accent-ink transition hover:brightness-110 disabled:opacity-50"
          >
            + Add package
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
              {editingId === "__new__" ? "Add a package" : "Edit package"}
            </h3>
            <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3">
              <Field label="Name">
                <input
                  className="field-input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Reformer Credits — 5"
                />
              </Field>
              <Field label="Category">
                <select
                  className="field-input"
                  value={form.family}
                  onChange={(e) => setForm({ ...form, family: e.target.value })}
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Kind">
                <select
                  className="field-input"
                  value={form.kind}
                  onChange={(e) => {
                    const kind = e.target.value as PackageKind;
                    setForm({
                      ...form,
                      kind,
                      singleClass: kind === "credits" ? form.singleClass : false,
                    });
                  }}
                >
                  <option value="credits">Credits</option>
                  <option value="membership">Membership</option>
                </select>
              </Field>

              {form.kind === "credits" ? (
                <Field label="Credit amount (incl. any bonus)">
                  <input
                    type="number"
                    min={1}
                    className="field-input"
                    value={form.creditAmount ?? 1}
                    onChange={(e) => {
                      const creditAmount = Number(e.target.value) || 1;
                      setForm({
                        ...form,
                        creditAmount,
                        singleClass: creditAmount === 1 ? form.singleClass : false,
                      });
                    }}
                  />
                </Field>
              ) : (
                <>
                  <Field label="Duration — days">
                    <input
                      type="number"
                      min={0}
                      className="field-input"
                      value={form.durationDays ?? ""}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          durationDays: e.target.value ? Number(e.target.value) : null,
                          durationMonths: e.target.value ? null : form.durationMonths,
                        })
                      }
                    />
                  </Field>
                  <Field label="Duration — months">
                    <input
                      type="number"
                      min={0}
                      className="field-input"
                      value={form.durationMonths ?? ""}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          durationMonths: e.target.value ? Number(e.target.value) : null,
                          durationDays: e.target.value ? null : form.durationDays,
                        })
                      }
                    />
                  </Field>
                </>
              )}

              <Field label="Price (AED, pre-VAT)">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className="field-input"
                  value={form.priceAed}
                  onChange={(e) => setForm({ ...form, priceAed: Number(e.target.value) || 0 })}
                />
              </Field>
              <Field label="Display tab">
                <select
                  className="field-input"
                  value={form.displayTab}
                  onChange={(e) => setForm({ ...form, displayTab: e.target.value as DisplayTab })}
                >
                  <option value="starter">Starter Pack</option>
                  <option value="credit">Credit Pack</option>
                  <option value="membership">Membership</option>
                </select>
              </Field>
              <Field label="Display order">
                <input
                  type="number"
                  className="field-input"
                  value={form.displayOrder}
                  onChange={(e) => setForm({ ...form, displayOrder: Number(e.target.value) || 0 })}
                />
              </Field>
              <Field label="Single-class option">
                <label
                  className={`flex h-[38px] items-center gap-2 text-[13px] ${canSingleClass ? "text-ink" : "text-muted"}`}
                >
                  <input
                    type="checkbox"
                    checked={form.singleClass}
                    disabled={!canSingleClass}
                    onChange={(e) => setForm({ ...form, singleClass: e.target.checked })}
                  />
                  Use as &quot;pay for this exact class&quot; price
                </label>
              </Field>
              {editingId !== "__new__" && (
                <Field label="Active">
                  <label className="flex h-[38px] items-center gap-2 text-[13px] text-ink">
                    <input
                      type="checkbox"
                      checked={form.active}
                      onChange={(e) => setForm({ ...form, active: e.target.checked })}
                    />
                    Visible for purchase
                  </label>
                </Field>
              )}
              <div className="col-span-2 sm:col-span-3">
                <Field label="Detail (shown on the pricing card)">
                  <input
                    className="field-input"
                    value={form.detail ?? ""}
                    onChange={(e) => setForm({ ...form, detail: e.target.value || null })}
                    placeholder="e.g. Valid for 2 Weeks"
                  />
                </Field>
              </div>
              <div className="col-span-2 sm:col-span-3">
                <Field label="Note (optional, smaller text)">
                  <input
                    className="field-input"
                    value={form.note ?? ""}
                    onChange={(e) => setForm({ ...form, note: e.target.value || null })}
                    placeholder="e.g. Prepaid, no ongoing commitment"
                  />
                </Field>
              </div>
            </div>
            <p className="mt-3 text-[11.5px] text-muted">
              Only one package per category can be flagged as the single-class option, and it
              must grant exactly 1 credit. Saving here creates or updates the real Stripe
              product/price — changing the price archives the old Stripe price and creates a
              new one.
            </p>
            <div className="mt-4 flex gap-2.5">
              <button
                onClick={saveForm}
                disabled={saving}
                className="rounded-[9px] bg-accent-strong px-4 py-2.5 text-[13px] font-bold text-accent-ink hover:brightness-110 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save package"}
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
            <p className="text-[13px] text-muted">Loading packages&hellip;</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] font-bold uppercase tracking-wide text-muted">
                    <th className="px-3 py-2.5">Name</th>
                    <th className="px-3 py-2.5">Category</th>
                    <th className="px-3 py-2.5">Kind</th>
                    <th className="px-3 py-2.5">Price</th>
                    <th className="px-3 py-2.5">Tab</th>
                    <th className="px-3 py-2.5">Status</th>
                    <th className="px-3 py-2.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {packages.map((p) => (
                    <tr key={p.id} className="border-b border-border last:border-none">
                      <td className="px-3 py-2.5 font-semibold">
                        {p.name}
                        {p.singleClass && (
                          <span className="ml-2 rounded-full bg-secondary-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-secondary-strong">
                            Single class
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-ink-secondary">
                        {categoryName.get(p.family) ?? p.family}
                      </td>
                      <td className="px-3 py-2.5 text-ink-secondary">
                        {p.kind === "credits" ? `${p.creditAmount} credits` : "Membership"}
                      </td>
                      <td className="px-3 py-2.5 font-mono">{formatAed(p.priceAed)}</td>
                      <td className="px-3 py-2.5 text-ink-secondary">{p.displayTab}</td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                            p.active
                              ? "bg-status-good-soft text-status-good"
                              : "bg-surface-2 text-muted"
                          }`}
                        >
                          {p.active ? "Active" : "Archived"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right whitespace-nowrap">
                        <button
                          onClick={() => startEdit(p)}
                          className="mr-2 text-[12px] font-bold text-accent-strong hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => toggleActive(p)}
                          className="text-[12px] font-bold text-ink-secondary hover:underline"
                        >
                          {p.active ? "Archive" : "Reactivate"}
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
