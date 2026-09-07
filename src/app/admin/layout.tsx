"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const isLoginPage = pathname === "/admin/login";

  useEffect(() => {
    if (isLoginPage) return;
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, [isLoginPage]);

  if (isLoginPage) return <>{children}</>;

  async function logOut() {
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-border bg-surface px-7 py-2.5">
        <span className="text-[12px] font-semibold text-muted">
          {email ? `Signed in as ${email}` : "Pure Motion staff"}
        </span>
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
