import Link from "next/link";

export default function Home() {
  return (
    <main className="flex-1 bg-bg">
      <div className="mx-auto max-w-6xl px-7 py-8">
        <header className="mb-10 flex items-center gap-2.5">
          <div className="flex h-[34px] w-[34px] items-center justify-center rounded-[9px] bg-gradient-to-br from-accent to-secondary font-display text-[15px] font-bold text-white">
            PM
          </div>
          <div className="flex flex-col leading-tight">
            <b className="font-display text-[17px] font-bold text-ink">Pure Motion</b>
            <span className="text-[11.5px] tracking-wide text-muted">
              REFORMER &amp; MAT PILATES
            </span>
          </div>
        </header>

        <section className="max-w-[600px] rounded-2xl border border-border bg-gradient-to-br from-surface to-surface-2 p-10 shadow-sm">
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
        </section>
      </div>
    </main>
  );
}
