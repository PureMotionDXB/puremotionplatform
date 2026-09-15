// Real Stripe product/price IDs for Pure Motion's packages (test
// mode, created via scripts/create-stripe-products.mjs on 2026-09-15).
// Re-run that script against live keys before going live, then swap
// these for the live price IDs.

export type PackageKey =
  | "reformer_intro"
  | "reformer_starter"
  | "mat_starter"
  | "reformer_credits_1"
  | "reformer_credits_5"
  | "reformer_credits_10"
  | "reformer_credits_20"
  | "mat_credits_1"
  | "mat_credits_5"
  | "mat_credits_10"
  | "membership_2weeks"
  | "membership_1month"
  | "membership_3months"
  | "membership_6months";

export interface PackageDef {
  key: PackageKey;
  name: string;
  priceId: string;
  /** Credits granted on purchase. Absent for Unlimited Memberships —
   * those aren't credit-based and need the membership/pass system
   * (not built yet) before they can be sold online. */
  credits?: { family: "reformer" | "mat"; amount: number };
}

export const packages: PackageDef[] = [
  {
    key: "reformer_intro",
    name: "Reformer Intro Class",
    priceId: "price_1UFpH2EGoOlooMtkkaHglQ92",
    credits: { family: "reformer", amount: 1 },
  },
  {
    key: "reformer_starter",
    name: "Reformer Starter Pack",
    priceId: "price_1UFpH3EGoOlooMtkYHKsMDCE",
    credits: { family: "reformer", amount: 4 },
  },
  {
    key: "mat_starter",
    name: "Mat Starter Pack",
    priceId: "price_1UFpH4EGoOlooMtkgvRHXTja",
    credits: { family: "mat", amount: 3 },
  },
  {
    key: "reformer_credits_1",
    name: "Reformer Credits — 1",
    priceId: "price_1UFpH4EGoOlooMtkUg1RhyPi",
    credits: { family: "reformer", amount: 1 },
  },
  {
    key: "reformer_credits_5",
    name: "Reformer Credits — 5",
    priceId: "price_1UFpH5EGoOlooMtkyhzu6gfb",
    credits: { family: "reformer", amount: 6 },
  },
  {
    key: "reformer_credits_10",
    name: "Reformer Credits — 10",
    priceId: "price_1UFpH6EGoOlooMtkCzRMs5hz",
    credits: { family: "reformer", amount: 10 },
  },
  {
    key: "reformer_credits_20",
    name: "Reformer Credits — 20",
    priceId: "price_1UFpH7EGoOlooMtkpZKvIe86",
    credits: { family: "reformer", amount: 25 },
  },
  {
    key: "mat_credits_1",
    name: "Mat Credits — 1",
    priceId: "price_1UFpH7EGoOlooMtkCGx6ykQK",
    credits: { family: "mat", amount: 1 },
  },
  {
    key: "mat_credits_5",
    name: "Mat Credits — 5",
    priceId: "price_1UFpH8EGoOlooMtkYMSkJIVv",
    credits: { family: "mat", amount: 5 },
  },
  {
    key: "mat_credits_10",
    name: "Mat Credits — 10",
    priceId: "price_1UFpH9EGoOlooMtkJX1tvorT",
    credits: { family: "mat", amount: 10 },
  },
  {
    key: "membership_2weeks",
    name: "2 Weeks Unlimited",
    priceId: "price_1UFpHAEGoOlooMtk6QPYAVGB",
  },
  {
    key: "membership_1month",
    name: "1 Month Unlimited",
    priceId: "price_1UFpHBEGoOlooMtkH8Zj4Wcb",
  },
  {
    key: "membership_3months",
    name: "3 Months Unlimited",
    priceId: "price_1UFpHBEGoOlooMtkHIUZuyiG",
  },
  {
    key: "membership_6months",
    name: "6 Months Unlimited",
    priceId: "price_1UFpHCEGoOlooMtkcUyey9sD",
  },
];

export function findPackage(key: string): PackageDef | undefined {
  return packages.find((p) => p.key === key);
}
