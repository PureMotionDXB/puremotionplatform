"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const whyPureMotion = [
  {
    title: "Certified Instructors",
    body: "Deep Pilates expertise, with safe and tailored guidance for every level.",
  },
  {
    title: "State-of-the-Art Equipment",
    body: "Train on the newest Merrithew V2 Max reformers and top-tier accessories.",
  },
  {
    title: "Classes for Every Level",
    body: "Beginner through advanced, so your journey moves at your pace.",
  },
  {
    title: "Holistic Wellness",
    body: "Sound healing and meditation sit alongside your classes, not left for later.",
  },
];

const studioGuide = [
  { title: "Pre-booking essential", body: "Book online or via the Mindbody app before you arrive." },
  { title: "12-hour cancellation notice", body: "Cancel at least 12 hours ahead to avoid a fee." },
  { title: "Arrive on time", body: "No entry after 5 minutes for any class." },
  { title: "Grip socks required", body: "A must for Reformer — available for purchase at the studio." },
  { title: "Free parking", body: "Shaded parking available in the lower ground." },
  { title: "Cashless studio", body: "All major cards accepted." },
];

export default function Home() {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setSignedIn(data.user !== null));
  }, []);

  return (
    <main className="flex-1 bg-bg">
      <div className="mx-auto max-w-6xl px-7 py-8">
        <header className="mb-10 flex flex-wrap items-center justify-between gap-4">
          <Image
            src="/logo.png"
            alt="Pure Motion"
            width={1200}
            height={800}
            priority
            className="h-14 w-auto"
          />
          <nav className="flex items-center gap-5 text-[13px] font-semibold">
            <Link href="/schedule" className="text-ink-secondary hover:text-ink">
              Schedule
            </Link>
            <Link href="/pricing" className="text-ink-secondary hover:text-ink">
              Pricing
            </Link>
            <Link href="/waiver" className="text-ink-secondary hover:text-ink">
              Studio Policy
            </Link>
            {signedIn ? (
              <Link href="/account" className="text-ink-secondary hover:text-ink">
                My account
              </Link>
            ) : (
              <Link href="/account/login" className="text-accent-strong hover:underline">
                Sign in
              </Link>
            )}
          </nav>
        </header>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,600px)_1fr] lg:items-stretch">
          <div className="rounded-2xl border border-border bg-gradient-to-br from-surface to-surface-2 p-10 shadow-sm">
            <span className="inline-block rounded-full bg-accent-soft px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-accent-strong">
              Your neighborhood Pilates club
            </span>
            <h1 className="mt-3.5 text-[32px] font-bold text-ink">Ready to move?</h1>
            <p className="mt-2 max-w-[420px] text-[14.5px] text-ink-secondary">
              See this week&rsquo;s reformer and mat classes, pick your spot, and
              you&rsquo;re booked in seconds.
            </p>
            <div className="mt-5 flex flex-wrap gap-2.5">
              <Link
                href="/schedule"
                className="rounded-[9px] bg-accent-strong px-4 py-2.5 text-[13px] font-bold text-accent-ink transition hover:brightness-110"
              >
                View schedule
              </Link>
              <Link
                href="/pricing"
                className="rounded-[9px] border border-border-strong px-4 py-2.5 text-[13px] font-bold text-ink transition hover:bg-surface-2"
              >
                View pricing &amp; offers
              </Link>
            </div>
          </div>
          <div className="relative min-h-[220px] overflow-hidden rounded-2xl">
            <Image
              src="/images/hero-class.jpg"
              alt="A Reformer Pilates class in session at Pure Motion"
              fill
              priority
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover"
            />
          </div>
        </section>

        <section className="mt-14 grid gap-8 lg:grid-cols-[1fr_minmax(0,320px)] lg:items-center">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-accent-strong">
              Welcome to Pure Motion
            </span>
            <h2 className="mt-2 font-display text-[24px] font-bold text-ink">
              A boutique Pilates studio in the heart of Jumeirah Golf Estates
            </h2>
            <p className="mt-3 text-[14.5px] leading-relaxed text-ink-secondary">
              Pure Motion is more than a Pilates studio — it&rsquo;s a sanctuary where
              movement, mindfulness, and community come together. Our certified
              instructors guide every session, from precision-focused Reformer work to
              grounding Mat and Yoga classes, in a space designed to help you move
              better, feel stronger, and build a healthier life.
            </p>
          </div>
          <div className="relative aspect-[4/5] overflow-hidden rounded-2xl">
            <Image
              src="/images/studio-quote.jpg"
              alt="Habibi, come to Pilates — wall art at Pure Motion studio"
              fill
              sizes="(min-width: 1024px) 320px, 100vw"
              className="object-cover"
            />
          </div>
        </section>

        <section className="relative mt-14 overflow-hidden rounded-2xl p-8">
          <Image
            src="/images/membership-bg.jpg"
            alt=""
            fill
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/55 to-black/20" />
          <div className="relative">
            <span className="text-[11px] font-bold uppercase tracking-wider text-accent">
              Memberships
            </span>
            <h2 className="mt-2 font-display text-[22px] font-bold text-white">
              Join the Movement
            </h2>
            <p className="mt-2 max-w-[480px] text-[14px] text-white/85">
              Unlock unlimited access to Reformer, Mat, and Yoga classes with a
              flexible monthly membership.
            </p>
            <Link
              href="/pricing"
              className="mt-4 inline-block rounded-[9px] bg-accent-strong px-4 py-2.5 text-[13px] font-bold text-accent-ink transition hover:brightness-110"
            >
              View memberships
            </Link>
          </div>
        </section>

        <section className="mt-14">
          <span className="text-[11px] font-bold uppercase tracking-wider text-accent-strong">
            Why choose Pure Motion
          </span>
          <h2 className="mt-2 font-display text-[24px] font-bold text-ink">
            Every detail, considered
          </h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {whyPureMotion.map((w) => (
              <div key={w.title} className="rounded-2xl border border-border bg-surface p-5">
                <h3 className="font-display text-[15px] font-bold text-ink">{w.title}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-ink-secondary">
                  {w.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-14">
          <span className="text-[11px] font-bold uppercase tracking-wider text-accent-strong">
            Studio guide
          </span>
          <h2 className="mt-2 font-display text-[24px] font-bold text-ink">
            Good to know before you arrive
          </h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {studioGuide.map((g) => (
              <div
                key={g.title}
                className="rounded-2xl border border-border bg-surface-2 p-4"
              >
                <h3 className="text-[13.5px] font-bold text-ink">{g.title}</h3>
                <p className="mt-1 text-[12.5px] leading-relaxed text-muted">{g.body}</p>
              </div>
            ))}
          </div>
        </section>

        <footer className="mt-16 border-t border-border pt-8 pb-4">
          <div className="flex flex-wrap items-start justify-between gap-8">
            <div>
              <b className="font-display text-[15px] font-bold text-ink">Pure Motion</b>
              <p className="mt-2 max-w-[280px] text-[12.5px] leading-relaxed text-muted">
                B Floor, ONE at Me&rsquo;aisem First,
                <br />
                Jumeirah Golf Estates, Dubai, UAE
              </p>
              <p className="mt-2 text-[12.5px] text-muted">
                +971 54 233 6404 &middot; info@puremotion.ae
              </p>
              <p className="mt-1 text-[12.5px] text-muted">Instagram &mdash; @puremotion.ae</p>
            </div>
            <nav className="flex flex-col gap-1.5 text-[12.5px] font-semibold text-ink-secondary">
              <Link href="/schedule" className="hover:text-ink">
                Schedule
              </Link>
              <Link href="/pricing" className="hover:text-ink">
                Pricing
              </Link>
              <Link href="/waiver" className="hover:text-ink">
                Liability Waiver
              </Link>
            </nav>
          </div>
          <p className="mt-8 text-[11.5px] text-muted">
            &copy; {new Date().getFullYear()} Pure Motion. All rights reserved. Jumeirah
            Golf Estates &middot; Dubai
          </p>
        </footer>
      </div>
    </main>
  );
}
