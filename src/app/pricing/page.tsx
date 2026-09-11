"use client";

import { useState } from "react";
import Link from "next/link";
import { Footer } from "@/components/Footer";

type TabKey = "starter" | "credit" | "membership";

interface PackageCard {
  name: string;
  price: string;
  detail: string;
  note?: string;
}

const starterPacks: PackageCard[] = [
  { name: "Reformer Intro Class", price: "AED 99", detail: "1 Credit — Valid for 7 Days" },
  {
    name: "Reformer Starter Pack",
    price: "AED 299",
    detail: "3 Credits (+1 FREE credit) — Valid for 2 Weeks",
  },
  { name: "Mat Starter Pack", price: "AED 255", detail: "3 Credits — Valid for 2 Weeks" },
];

const reformerCreditPacks: PackageCard[] = [
  { name: "1 Credit", price: "AED 165", detail: "Valid for 7 Days" },
  { name: "5 Credits", price: "AED 775", detail: "+1 FREE credit — Valid for 1 Month" },
  { name: "10 Credits", price: "AED 1,450", detail: "Valid for 2 Months" },
  { name: "20 Credits", price: "AED 2,500", detail: "+5 FREE credits — Valid for 4 Months" },
];

const matCreditPacks: PackageCard[] = [
  { name: "1 Credit", price: "AED 125", detail: "Valid for 7 Days" },
  { name: "5 Credits", price: "AED 495", detail: "Valid for 1 Month" },
  { name: "10 Credits", price: "AED 950", detail: "Valid for 2 Months" },
];

const memberships: PackageCard[] = [
  {
    name: "2 Weeks Unlimited",
    price: "AED 899",
    detail: "Reformer — Valid 2 Weeks",
    note: "Prepaid, no ongoing commitment",
  },
  {
    name: "1 Month Unlimited",
    price: "AED 1,900",
    detail: "Reformer — Valid 1 Month",
    note: "Prepaid, no ongoing commitment",
  },
  {
    name: "3 Months Unlimited",
    price: "AED 4,500",
    detail: "Reformer — Valid 3 Months",
    note: "AED 1,500/month · Prepaid in full on sign-up",
  },
  {
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

function Card({ pkg }: { pkg: PackageCard }) {
  return (
    <div className="flex flex-col rounded-2xl border border-border bg-surface p-5">
      <h3 className="font-display text-[15px] font-bold text-ink">{pkg.name}</h3>
      <div className="mt-2 font-display text-[22px] font-bold text-accent-strong">
        {pkg.price} <span className="text-[13px] font-semibold text-muted">+ VAT</span>
      </div>
      <p className="mt-1.5 text-[13px] text-ink-secondary">{pkg.detail}</p>
      {pkg.note && <p className="mt-1 text-[11.5px] text-muted">{pkg.note}</p>}
      <a
        href={`mailto:info@puremotion.ae?subject=${encodeURIComponent(`I'd like to buy: ${pkg.name}`)}`}
        className="mt-4 rounded-[9px] border border-border-strong px-4 py-2.5 text-center text-[13px] font-bold text-ink transition hover:bg-surface-2"
      >
        Ask at the studio
      </a>
    </div>
  );
}

export default function PricingPage() {
  const [tab, setTab] = useState<TabKey>("starter");

  return (
    <main className="flex-1 bg-bg">
      <div className="mx-auto max-w-6xl px-7 py-8">
        <h1 className="font-display text-[23px] font-bold text-ink">
          Memberships &amp; Packages
        </h1>
        <p className="mt-1 max-w-[520px] text-[13px] text-muted">
          All prices are subject to 5% VAT. Packages are non-refundable and non-transferable
          — see our{" "}
          <Link href="/terms" className="font-semibold text-accent-strong hover:underline">
            Terms &amp; Conditions
          </Link>
          . Online checkout is coming soon — for now, reach out and we&rsquo;ll get you set up.
        </p>

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
                <Card key={pkg.name} pkg={pkg} />
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
                <Card key={pkg.name} pkg={pkg} />
              ))}
            </div>
            <h2 className="mt-6 text-[13px] font-bold uppercase tracking-wide text-muted">
              Mat Pilates
            </h2>
            <div className="mt-2.5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {matCreditPacks.map((pkg) => (
                <Card key={pkg.name} pkg={pkg} />
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
                <Card key={pkg.name} pkg={pkg} />
              ))}
            </div>
          </div>
        )}
      </div>
      <Footer />
    </main>
  );
}
