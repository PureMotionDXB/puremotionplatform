"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { supabase } from "@/lib/supabase";
import { getErrorMessage } from "@/lib/schedule-data";
import type { PackageKey } from "@/lib/stripe-catalog";

type TabKey = "starter" | "credit" | "membership";

interface PackageCard {
  packageKey: PackageKey;
  name: string;
  price: string;
  detail: string;
  note?: string;
}

const starterPacks: PackageCard[] = [
  {
    packageKey: "reformer_intro",
    name: "Reformer Intro Class",
    price: "AED 99",
    detail: "1 Credit — Valid for 7 Days",
  },
  {
    packageKey: "reformer_starter",
    name: "Reformer Starter Pack",
    price: "AED 299",
    detail: "3 Credits (+1 FREE credit) — Valid for 2 Weeks",
  },
  {
    packageKey: "mat_starter",
    name: "Mat Starter Pack",
    price: "AED 255",
    detail: "3 Credits — Valid for 2 Weeks",
  },
];

const reformerCreditPacks: PackageCard[] = [
  { packageKey: "reformer_credits_1", name: "1 Credit", price: "AED 165", detail: "Valid for 7 Days" },
  {
    packageKey: "reformer_credits_5",
    name: "5 Credits",
    price: "AED 775",
    detail: "+1 FREE credit — Valid for 1 Month",
  },
  { packageKey: "reformer_credits_10", name: "10 Credits", price: "AED 1,450", detail: "Valid for 2 Months" },
  {
    packageKey: "reformer_credits_20",
    name: "20 Credits",
    price: "AED 2,500",
    detail: "+5 FREE credits — Valid for 4 Months",
  },
];

const matCreditPacks: PackageCard[] = [
  { packageKey: "mat_credits_1", name: "1 Credit", price: "AED 125", detail: "Valid for 7 Days" },
  { packageKey: "mat_credits_5", name: "5 Credits", price: "AED 495", detail: "Valid for 1 Month" },
  { packageKey: "mat_credits_10", name: "10 Credits", price: "AED 950", detail: "Valid for 2 Months" },
];

const memberships: PackageCard[] = [
  {
    packageKey: "membership_2weeks",
    name: "2 Weeks Unlimited",
    price: "AED 899",
    detail: "Reformer — Valid 2 Weeks",
    note: "Prepaid, no ongoing commitment",
  },
  {
    packageKey: "membership_1month",
    name: "1 Month Unlimited",
    price: "AED 1,900",
    detail: "Reformer — Valid 1 Month",
    note: "Prepaid, no ongoing commitment",
  },
  {
    packageKey: "membership_3months",
    name: "3 Months Unlimited",
    price: "AED 4,500",
    detail: "Reformer — Valid 3 Months",
    note: "AED 1,500/month · Prepaid in full on sign-up",
  },
  {
    packageKey: "membership_6months",
    name: "6 Months Unlimited",
    price: "AED 7,200",
    detail: "Reformer — Valid 6 Months",
    note: "AED 1,200/month · Prepaid in full on sign-up",
  },
];

const tabs: { key: TabKey; label: string }[] = [
  { key: "starter", label: "Starter Pack" },
  { key: "credit", label: "Credit Pack" },
  { key: "membership", label: "Membership" },
];

function Card({
  pkg,
  signedIn,
  busy,
  onBuy,
}: {
  pkg: PackageCard;
  signedIn: boolean;
  busy: boolean;
  onBuy: (key: PackageKey) => void;
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-border bg-surface p-5">
      <h3 className="font-display text-[15px] font-bold text-ink">{pkg.name}</h3>
      <div className="mt-2 font-display text-[22px] font-bold text-accent-strong">
        {pkg.price} <span className="text-[13px] font-semibold text-muted">+ VAT</span>
      </div>
      <p className="mt-1.5 text-[13px] text-ink-secondary">{pkg.detail}</p>
      {pkg.note && <p className="mt-1 text-[11.5px] text-muted">{pkg.note}</p>}
      {signedIn ? (
        <button
          onClick={() => onBuy(pkg.packageKey)}
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
  const [busyKey, setBusyKey] = useState<PackageKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setSignedIn(data.user !== null));
  }, []);

  async function handleBuy(packageKey: PackageKey) {
    setBusyKey(packageKey);
    setError(null);
    try {
      const res = await fetch("/api/checkout/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageKey }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to start checkout");
      window.location.href = data.url;
    } catch (err) {
      setError(getErrorMessage(err, "Failed to start checkout."));
      setBusyKey(null);
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

        {tab === "starter" && (
          <div className="mt-6">
            <p className="text-[13px] text-ink-secondary">
              Perfect for first timers — new to the studio? Start here. 1 Credit = 1 Class.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {starterPacks.map((pkg) => (
                <Card
                  key={pkg.packageKey}
                  pkg={pkg}
                  signedIn={signedIn}
                  busy={busyKey === pkg.packageKey}
                  onBuy={handleBuy}
                />
              ))}
            </div>
          </div>
        )}

        {tab === "credit" && (
          <div className="mt-6">
            <p className="text-[13px] text-ink-secondary">
              For those balancing life, work, and self-care — move at your own pace.
            </p>
            <h2 className="mt-5 text-[13px] font-bold uppercase tracking-wide text-muted">
              Reformer
            </h2>
            <div className="mt-2.5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {reformerCreditPacks.map((pkg) => (
                <Card
                  key={pkg.packageKey}
                  pkg={pkg}
                  signedIn={signedIn}
                  busy={busyKey === pkg.packageKey}
                  onBuy={handleBuy}
                />
              ))}
            </div>
            <h2 className="mt-6 text-[13px] font-bold uppercase tracking-wide text-muted">
              Mat Pilates
            </h2>
            <div className="mt-2.5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {matCreditPacks.map((pkg) => (
                <Card
                  key={pkg.packageKey}
                  pkg={pkg}
                  signedIn={signedIn}
                  busy={busyKey === pkg.packageKey}
                  onBuy={handleBuy}
                />
              ))}
            </div>
          </div>
        )}

        {tab === "membership" && (
          <div className="mt-6">
            <p className="text-[13px] text-ink-secondary">
              For those fully committed to their practice, wanting a seamless, hassle-free
              experience. All memberships are billed upfront upon checkout.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {memberships.map((pkg) => (
                <Card
                  key={pkg.packageKey}
                  pkg={pkg}
                  signedIn={signedIn}
                  busy={busyKey === pkg.packageKey}
                  onBuy={handleBuy}
                />
              ))}
            </div>
          </div>
        )}
      </div>
      <Footer />
    </main>
  );
}
