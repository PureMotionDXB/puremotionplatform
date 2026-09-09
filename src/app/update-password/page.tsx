"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getErrorMessage } from "@/lib/schedule-data";
import { fetchMyStaffInfo } from "@/lib/admin-db";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [expired, setExpired] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let settled = false;

    supabase.auth.getSession().then(({ data }) => {
      if (data.session && !settled) {
        settled = true;
        setReady(true);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session && !settled) {
        settled = true;
        setReady(true);
      }
    });

    const timeout = setTimeout(() => {
      if (!settled) setExpired(true);
    }, 5000);

    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      const staffInfo = await fetchMyStaffInfo();
      router.push(staffInfo ? "/admin/schedule" : "/account");
      router.refresh();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to update your password."));
      setLoading(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-bg px-6 py-12">
      <div className="w-full max-w-[360px] rounded-2xl border border-border bg-surface p-6">
        <h1 className="font-display text-[19px] font-bold text-ink">Set a new password</h1>

        {expired ? (
          <>
            <p className="mt-3 text-[13px] text-ink-secondary">
              This reset link is invalid or has expired. Request a new one to continue.
            </p>
            <a
              href="/reset-password"
              className="mt-5 inline-block w-full rounded-[9px] bg-accent-strong px-4 py-2.5 text-center text-[13px] font-bold text-accent-ink transition hover:brightness-110"
            >
              Request a new link
            </a>
          </>
        ) : !ready ? (
          <p className="mt-3 text-[13px] text-muted">Verifying your link&hellip;</p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-3.5">
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wide text-muted">
                New password
              </span>
              <input
                type="password"
                required
                autoComplete="new-password"
                className="field-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wide text-muted">
                Confirm password
              </span>
              <input
                type="password"
                required
                autoComplete="new-password"
                className="field-input"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </label>

            {error && <p className="text-[12.5px] text-status-critical">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="mt-1.5 w-full rounded-[9px] bg-accent-strong px-4 py-2.5 text-[13px] font-bold text-accent-ink transition hover:brightness-110 disabled:opacity-50"
            >
              {loading ? "Saving…" : "Save new password"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
