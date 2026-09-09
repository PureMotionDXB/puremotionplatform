"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    router.push("/admin/schedule");
    router.refresh();
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-bg px-6 py-12">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-[360px] rounded-2xl border border-border bg-surface p-6"
      >
        <h1 className="font-display text-[19px] font-bold text-ink">Staff sign in</h1>
        <p className="mt-1 text-[13px] text-muted">Pure Motion internal access only.</p>

        <div className="mt-5 flex flex-col gap-3.5">
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wide text-muted">
              Email
            </span>
            <input
              type="email"
              required
              autoComplete="username"
              className="field-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wide text-muted">
              Password
            </span>
            <input
              type="password"
              required
              autoComplete="current-password"
              className="field-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
        </div>

        {error && (
          <p className="mt-3 text-[12.5px] text-status-critical">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-5 w-full rounded-[9px] bg-accent-strong px-4 py-2.5 text-[13px] font-bold text-accent-ink transition hover:brightness-110 disabled:opacity-50"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>

        <p className="mt-4 text-center text-[12.5px] text-muted">
          <Link href="/reset-password" className="font-bold text-accent-strong hover:underline">
            Forgot your password?
          </Link>
        </p>
      </form>
    </main>
  );
}
