import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-border pt-8 pb-4">
      <div className="mx-auto flex max-w-6xl flex-wrap items-start justify-between gap-8 px-7">
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
          <Link href="/terms" className="hover:text-ink">
            Terms &amp; Conditions
          </Link>
          <Link href="/privacy-policy" className="hover:text-ink">
            Privacy Policy
          </Link>
          <Link href="/waiver" className="hover:text-ink">
            Liability Waiver
          </Link>
        </nav>
      </div>
      <p className="mx-auto mt-8 max-w-6xl px-7 text-[11.5px] text-muted">
        &copy; {new Date().getFullYear()} Pure Motion. All rights reserved. Jumeirah Golf
        Estates &middot; Dubai
      </p>
    </footer>
  );
}
