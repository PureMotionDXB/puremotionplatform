"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { supabase } from "@/lib/supabase";
import { getErrorMessage } from "@/lib/schedule-data";
import { fetchActivePackages } from "@/lib/packages-db";
import { fetchCategories } from "@/lib/categories-db";
import type { Package, DisplayTab } from "@/lib/packages-data";
import type { ServiceCategory } from "@/lib/categories-data";

type TabKey = DisplayTab;

const tabs: { key: TabKey; label: string }[] = [
  { key: "starter", label: "Starter Pack" },
  { key: "credit", label: "Credit Pack" },
  { key: "membership", label: "Membership" },
];

function formatAed(priceAed: number): string {
  return `AED ${Math.round(priceAed).toLocaleString()}`;
}

function Card({
  pkg,
  signedIn,
  busy,
  onBuy,
}: {
  pkg: Package;
  signedIn: boolean;
  busy: boolean;
  onBuy: (id: string) => void;
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-border bg-surface p-5">
      <h3 className="font-display text-[15px] font-bold text-ink">{pkg.name}</h3>
      <div className="mt-2 font-display text-[22px] font-bold text-accent-strong">
        {formatAed(pkg.priceAed)} <span className="text-[13px] font-semibold text-muted">+ VAT</span>
      </div>
      {pkg.detail && <p className="mt-1.5 text-[13px] text-ink-secondary">{pkg.detail}</p>}
      {pkg.note && <p className="mt-1 text-[11.5px] text-muted">{pkg.note}</p>}
      {signedIn ? (
        <button
          onClick={() => onBuy(pkg.id)}
          disabled={busy}
          className="mt-4 rounded-[9px] bg-accent-strong px-4 py-2.5 text-[13px] font-bold text-accent-ink transition hover:brightness-110 disabled:opacity-50"
        >
          {busy ? "Redirecting…" : "Buy now"}
        </button>
      ) : (
        <Link
          href="/account/login"
          className="mt-4 rounded-[9px] bg-accent-strong px-4 py-2.5 text-center text-[13px] font-bold text-accent-ink transition hover:brightness-110"
        >
          Sign in to buy
        </Link>
      )}
    </div>
  );
}

export default function PricingPage() {
  const [tab, setTab] = useState<TabKey>("starter");
  const [signedIn, setSignedIn] = useState(false);
  const [packages, setPackages] = useState<Package[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setSignedIn(data.user !== null));
    Promise.all([fetchActivePackages(), fetchCategories()])
      .then(([packageData, categoryData]) => {
        setPackages(packageData);
        setCategories(categoryData);
      })
      .catch((err) => setError(getErrorMessage(err, "Failed to load pricing.")))
      .finally(() => setLoading(false));
  }, []);

  const categoryName = useMemo(
    () => new Map(categories.map((c) => [c.id, c.name])),
    [categories],
  );

  const byTab = useMemo(() => {
    const grouped: Record<TabKey, Package[]> = { starter: [], credit: [], membership: [] };
    for (const pkg of packages) {
      grouped[pkg.displayTab].push(pkg);
    }
    return grouped;
  }, [packages]);

  const creditByFamily = useMemo(() => {
    const families = Array.from(new Set(byTab.credit.map((p) => p.family)));
    return families.map((family) => ({
      family,
      label: categoryName.get(family) ?? family,
      items: byTab.credit.filter((p) => p.family === family),
    }));
  }, [byTab.credit, categoryName]);

  async function handleBuy(packageId: string) {
    setBusyId(packageId);
    setError(null);
    try {
      const res = await fetch("/api/checkout/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to start checkout");
      window.location.href = data.url;
    } catch (err) {
      setError(getErrorMessage(err, "Failed to start checkout."));
      setBusyId(null);
    }
  }

  return (
    <main className="flex-1 bg-bg">
      <Header />
      <div className="mx-auto max-w-6xl px-7 py-8">
        <h1 className="font-display text-[23px] font-bold text-ink">
          Memberships &amp; Packages
        </h1>
        <p className="mt-1 max-w-[520px] text-[13px] text-muted">
          All prices are subject to 5% VAT, calculated at checkout. Packages are
          non-refundable and non-transferable — see our{" "}
          <Link href="/terms" className="font-semibold text-accent-strong hover:underline">
            Terms &amp; Conditions
          </Link>
          .
        </p>

        {error && (
          <div className="mt-4 rounded-2xl border border-status-critical bg-status-critical-soft p-4 text-[13px] text-status-critical">
            {error}
          </div>
        )}

        <div className="mt-6 flex max-w-[420px] gap-1.5 rounded-xl bg-surface-2 p-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 rounded-[9px] px-2.5 py-2 text-[13px] font-bold transition ${
                tab === t.key ? "bg-surface text-ink shadow-sm" : "text-ink-secondary hover:text-ink"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="mt-6 text-[13px] text-muted">Loading pricing&hellip;</p>
        ) : (
          <>
            {tab === "starter" && (
              <div className="mt-6">
                <p className="text-[13px] text-ink-secondary">
                  Perfect for first timers — new to the studio? Start here. 1 Credit = 1 Class.
                </p>
                {byTab.starter.length === 0 ? (
                  <p className="mt-4 text-[13px] text-muted">No starter packs available right now.</p>
                ) : (
                  <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {byTab.starter.map((pkg) => (
                      <Card key={pkg.id} pkg={pkg} signedIn={signedIn} busy={busyId === pkg.id} onBuy={handleBuy} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === "credit" && (
              <div className="mt-6">
                <p className="text-[13px] text-ink-secondary">
                  For those balancing life, work, and self-care — move at your own pace.
                </p>
                {creditByFamily.length === 0 ? (
                  <p className="mt-4 text-[13px] text-muted">No credit packs available right now.</p>
                ) : (
                  creditByFamily.map((group) => (
                    <div key={group.family}>
                      <h2 className="mt-6 text-[13px] font-bold uppercase tracking-wide text-muted first:mt-5">
                        {group.label}
                      </h2>
                      <div className="mt-2.5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {group.items.map((pkg) => (
                          <Card key={pkg.id} pkg={pkg} signedIn={signedIn} busy={busyId === pkg.id} onBuy={handleBuy} />
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {tab === "membership" && (
              <div className="mt-6">
                <p className="text-[13px] text-ink-secondary">
                  For those fully committed to their practice, wanting a seamless, hassle-free
                  experience. All memberships are billed upfront upon checkout.
                </p>
                {byTab.membership.length === 0 ? (
                  <p className="mt-4 text-[13px] text-muted">No memberships available right now.</p>
                ) : (
                  <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {byTab.membership.map((pkg) => (
                      <Card key={pkg.id} pkg={pkg} signedIn={signedIn} busy={busyId === pkg.id} onBuy={handleBuy} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
      <Footer />
    </main>
  );
}
