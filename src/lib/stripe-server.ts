// Shared helper for the admin package-management API routes. Same
// raw-fetch convention used everywhere else Stripe is called in this
// codebase (no `stripe` npm dependency) — see create-session/route.ts
// and webhooks/stripe/route.ts.

export class StripeError extends Error {}

export async function stripeRequest(
  secretKey: string,
  path: string,
  params: Record<string, string>,
): Promise<Record<string, unknown>> {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(params),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new StripeError(
      typeof data.error?.message === "string" ? data.error.message : `Stripe request to ${path} failed`,
    );
  }
  return data;
}
