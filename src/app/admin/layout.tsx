"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { fetchMyStaffInfo, type StaffInfo } from "@/lib/admin-db";

const adminNavLinks = [
  { href: "/admin/schedule", label: "Schedule" },
  { href: "/admin/roster", label: "Roster" },
  { href: "/admin/clients", label: "Clients" },
  { href: "/admin/reports", label: "Reports" },
];

const instructorNavLinks = [{ href: "/admin/roster", label: "My Roster" }];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [staffInfo, setStaffInfo] = useState<StaffInfo | null>(null);
  const isLoginPage = pathname === "/admin/login";

  useEffect(() => {
    if (isLoginPage) return;
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    fetchMyStaffInfo().then(setStaffInfo);
  }, [isLoginPage]);

  const navLinks = staffInfo?.role === "instructor" ? instructorNavLinks : adminNavLinks;

  if (isLoginPage) return <>{children}</>;

  async function logOut() {
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface px-7 py-2.5">
        <div className="flex items-center gap-4">
          <span className="text-[12px] font-semibold text-muted">
            {email ? `Signed in as ${email}` : "Pure Motion staff"}
          </span>
          <nav className="flex gap-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-[12.5px] font-bold ${
                  pathname === link.href
                    ? "text-accent-strong"
                    : "text-ink-secondary hover:text-ink"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <button
          onClick={logOut}
          className="text-[12px] font-bold text-status-critical hover:underline"
        >
          Log out
        </button>
      </div>
      {children}
    </div>
  );
}
