"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { countryCodes } from "@/lib/country-codes";

function calculateAge(dob: string): number {
  const birthDate = new Date(`${dob}T00:00:00`);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

export default function SignupPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [countryDial, setCountryDial] = useState("+971");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [gender, setGender] = useState<"" | "female" | "male">("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [liabilityAccepted, setLiabilityAccepted] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!gender) {
      setError("Please select a gender.");
      return;
    }
    if (!dateOfBirth) {
      setError("Please enter your date of birth.");
      return;
    }
    if (calculateAge(dateOfBirth) < 18) {
      setError("You must be 18 or older to create an account.");
      return;
    }
    if (!ageConfirmed) {
      setError("Please confirm you are above 18 years of age.");
      return;
    }
    if (!liabilityAccepted) {
      setError("Please read and agree to the liability waiver.");
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: `${firstName.trim()} ${lastName.trim()}`.trim(),
          phone: `${countryDial} ${phoneNumber.trim()}`,
          gender,
          date_of_birth: dateOfBirth,
          liability_accepted: true,
        },
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
        className="w-full max-w-[400px] rounded-2xl border border-border bg-surface p-6"
      >
        <h1 className="font-display text-[19px] font-bold text-ink">Create your account</h1>
        <p className="mt-1 text-[13px] text-muted">Book classes and track your credits.</p>

        <div className="mt-5 flex flex-col gap-3.5">
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wide text-muted">
                First name
              </span>
              <input
                required
                className="field-input"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wide text-muted">
                Last name
              </span>
              <input
                required
                className="field-input"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </label>
          </div>

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
              Phone / WhatsApp
            </span>
            <div className="flex gap-2">
              <select
                className="field-input w-[108px] shrink-0"
                value={countryDial}
                onChange={(e) => setCountryDial(e.target.value)}
              >
                {countryCodes.map((c) => (
                  <option key={c.iso2} value={c.dial}>
                    {c.dial} {c.name}
                  </option>
                ))}
              </select>
              <input
                type="tel"
                required
                placeholder="50 123 4567"
                className="field-input min-w-0 flex-1"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
            </div>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wide text-muted">
              Gender
            </span>
            <select
              required
              className="field-input"
              value={gender}
              onChange={(e) => setGender(e.target.value as typeof gender)}
            >
              <option value="" disabled>
                Select...
              </option>
              <option value="female">Female</option>
              <option value="male">Male</option>
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wide text-muted">
              Date of birth
            </span>
            <input
              type="date"
              required
              className="field-input"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
            />
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

          <label className="flex items-start gap-2 text-[12.5px] text-ink">
            <input
              type="checkbox"
              required
              className="mt-0.5"
              checked={ageConfirmed}
              onChange={(e) => setAgeConfirmed(e.target.checked)}
            />
            I confirm I am above 18 years of age.
          </label>

          <label className="flex items-start gap-2 text-[12.5px] text-ink">
            <input
              type="checkbox"
              required
              className="mt-0.5"
              checked={liabilityAccepted}
              onChange={(e) => setLiabilityAccepted(e.target.checked)}
            />
            <span>
              I have read and agree to Pure Motion&rsquo;s{" "}
              <Link
                href="/waiver"
                target="_blank"
                className="font-bold text-accent-strong hover:underline"
              >
                Liability Waiver &amp; Release Form
              </Link>
              .
            </span>
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
