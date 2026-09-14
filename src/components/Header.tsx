"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const menuLinks = [
  { href: "/", label: "Home" },
  { href: "/schedule", label: "Schedule" },
  { href: "/schedule", label: "Book a Class" },
  { href: "/pricing", label: "Packages" },
  { href: "/membership-benefits", label: "Membership Benefits" },
  { href: "/class-types", label: "Class Types" },
  { href: "/events", label: "Events" },
  { href: "/gift-cards", label: "Gift Cards" },
  { href: "/about", label: "About" },
  { href: "/faq", label: "FAQ" },
  { href: "/studio-policies", label: "Studio Policies" },
  { href: "/contact", label: "Contact" },
];

export function Header() {
  const [signedIn, setSignedIn] = useState(false);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setSignedIn(data.user !== null));
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-7 py-6">
      <Link href="/">
        <Image
          src="/logo.png"
          alt="Pure Motion"
          width={1200}
          height={800}
          priority
          className="h-14 w-auto"
        />
      </Link>

      <div className="flex items-center gap-4">
        <Link
          href={signedIn ? "/account" : "/account/login"}
          className="text-[13px] font-semibold text-ink-secondary hover:text-ink"
        >
          {signedIn ? "My account" : "Sign in"}
        </Link>

        <div ref={menuRef} className="relative">
          <button
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-haspopup="true"
            className="flex items-center gap-2 rounded-[9px] border border-border-strong px-3.5 py-2 text-[13px] font-bold text-ink transition hover:bg-surface-2"
          >
            Menu
            <span className="flex flex-col gap-[3px]">
              <span className="block h-[2px] w-4 bg-ink" />
              <span className="block h-[2px] w-4 bg-ink" />
              <span className="block h-[2px] w-4 bg-ink" />
            </span>
          </button>

          {open && (
            <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-56 overflow-hidden rounded-2xl border border-border bg-surface shadow-lg">
              <nav className="flex flex-col py-1.5">
                {menuLinks.map((link, i) => (
                  <Link
                    key={`${link.href}-${i}`}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="px-4 py-2.5 text-[13px] font-semibold text-ink-secondary transition hover:bg-surface-2 hover:text-ink"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
