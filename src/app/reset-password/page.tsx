"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-bg px-6 py-12">
      <div className="w-full max-w-[360px] rounded-2xl border border-border bg-surface p-6">
        <h1 className="font-display text-[19px] font-bold text-ink">Reset your password</h1>
        <p className="mt-1 text-[13px] text-muted">
          Enter the email on your Pure Motion account and we&rsquo;ll send you a link to set
          a new password.
        </p>

        {sent ? (
          <p className="mt-5 text-[13px] text-ink-secondary">
            If an account exists for <b className="text-ink">{email}</b>, a reset link is on
            its way. Check your inbox (and spam folder).
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-3.5">
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

            {error && <p className="text-[12.5px] text-status-critical">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="mt-1.5 w-full rounded-[9px] bg-accent-strong px-4 py-2.5 text-[13px] font-bold text-accent-ink transition hover:brightness-110 disabled:opacity-50"
            >
              {loading ? "Sending…" : "Send reset link"}
            </button>
          </form>
        )}

        <p className="mt-4 text-center text-[12.5px] text-muted">
          <Link href="/account/login" className="font-bold text-accent-strong hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
