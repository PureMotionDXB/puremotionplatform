"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState<"female" | "male" | "unspecified">("unspecified");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, phone, gender },
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    if (data.session) {
      router.push("/account");
      router.refresh();
      return;
    }
    setCheckEmail(true);
    setLoading(false);
  }

  if (checkEmail) {
    return (
      <main className="flex flex-1 items-center justify-center bg-bg px-6 py-12">
        <div className="w-full max-w-[360px] rounded-2xl border border-border bg-surface p-6 text-center">
          <h1 className="font-display text-[19px] font-bold text-ink">Check your email</h1>
          <p className="mt-2 text-[13px] text-muted">
            We sent a confirmation link to {email}. Click it, then come back and sign in.
          </p>
          <Link
            href="/account/login"
            className="mt-4 inline-block text-[13px] font-bold text-accent-strong hover:underline"
          >
            Go to sign in
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-bg px-6 py-12">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-[360px] rounded-2xl border border-border bg-surface p-6"
      >
        <h1 className="font-display text-[19px] font-bold text-ink">Create your account</h1>
        <p className="mt-1 text-[13px] text-muted">Book classes and track your credits.</p>

        <div className="mt-5 flex flex-col gap-3.5">
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wide text-muted">
              Full name
            </span>
            <input
              required
              className="field-input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </label>
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
              Phone
            </span>
            <input
              type="tel"
              className="field-input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wide text-muted">
              Gender
            </span>
            <select
              className="field-input"
              value={gender}
              onChange={(e) => setGender(e.target.value as typeof gender)}
            >
              <option value="unspecified">Prefer not to say</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
            </select>
            <span className="text-[11px] text-muted">
              Needed to book Ladies Only classes.
            </span>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wide text-muted">
              Password
            </span>
            <input
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              className="field-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
        </div>

        {error && <p className="mt-3 text-[12.5px] text-status-critical">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-5 w-full rounded-[9px] bg-accent-strong px-4 py-2.5 text-[13px] font-bold text-accent-ink transition hover:brightness-110 disabled:opacity-50"
        >
          {loading ? "Creating account…" : "Create account"}
        </button>

        <p className="mt-4 text-center text-[12.5px] text-muted">
          Already have an account?{" "}
          <Link href="/account/login" className="font-bold text-accent-strong hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </main>
  );
}
