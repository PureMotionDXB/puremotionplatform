// One-off setup script: creates all 14 real Pure Motion packages as
// Stripe Products + one-time Prices, in AED, at the advertised BASE
// price (tax_behavior: "exclusive") — Stripe Tax adds the 5% VAT on
// top at checkout and shows it as its own line item, matching the
// "+ VAT" pricing already shown on the site.
//
// Requires Stripe Tax to be enabled with a UAE tax registration
// (Stripe Dashboard → Settings → Tax → Registrations) BEFORE this
// matters — otherwise a price marked "exclusive" with no active
// registration just charges the base amount with no tax added.
//
// Usage:
//   STRIPE_SECRET_KEY=sk_live_or_test_... node scripts/create-stripe-products.mjs
//
// Requires Node 18+ (built-in fetch). No dependencies needed.

const apiKey = process.env.STRIPE_SECRET_KEY;
if (!apiKey) {
  console.error("Set STRIPE_SECRET_KEY in your shell before running this script.");
  console.error("Example: STRIPE_SECRET_KEY=sk_test_... node scripts/create-stripe-products.mjs");
  process.exit(1);
}

// unit_amount is in fils (AED cents) — the advertised base price,
// before VAT. Stripe Tax adds 5% on top at checkout.
const packages = [
  { name: "Reformer Intro Class", description: "1 Credit — Valid for 7 Days", unit_amount: 9900 },
  { name: "Reformer Starter Pack", description: "3 Credits (+1 FREE credit) — Valid for 2 Weeks", unit_amount: 29900 },
  { name: "Mat Starter Pack", description: "3 Credits — Valid for 2 Weeks", unit_amount: 25500 },
  { name: "Reformer Credits — 1", description: "1 Credit — Valid for 7 Days", unit_amount: 16500 },
  { name: "Reformer Credits — 5", description: "5 Credits (+1 FREE) — Valid for 1 Month", unit_amount: 77500 },
  { name: "Reformer Credits — 10", description: "10 Credits — Valid for 2 Months", unit_amount: 145000 },
  { name: "Reformer Credits — 20", description: "20 Credits (+5 FREE) — Valid for 4 Months", unit_amount: 250000 },
  { name: "Mat Credits — 1", description: "1 Credit — Valid for 7 Days", unit_amount: 12500 },
  { name: "Mat Credits — 5", description: "5 Credits — Valid for 1 Month", unit_amount: 49500 },
  { name: "Mat Credits — 10", description: "10 Credits — Valid for 2 Months", unit_amount: 95000 },
  { name: "2 Weeks Unlimited", description: "Reformer — Valid 2 Weeks, prepaid, no ongoing commitment", unit_amount: 89900 },
  { name: "1 Month Unlimited", description: "Reformer — Valid 1 Month, prepaid, no ongoing commitment", unit_amount: 190000 },
  { name: "3 Months Unlimited", description: "Reformer — Valid 3 Months, prepaid in full on sign-up", unit_amount: 450000 },
  { name: "6 Months Unlimited", description: "Reformer — Valid 6 Months, prepaid in full on sign-up", unit_amount: 720000 },
];

async function stripePost(path, params) {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(params),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Stripe API error for ${path}: ${data.error?.message ?? JSON.stringify(data)}`);
  }
  return data;
}

async function main() {
  const results = [];
  for (const pkg of packages) {
    const product = await stripePost("products", {
      name: pkg.name,
      description: pkg.description,
    });
    const price = await stripePost("prices", {
      product: product.id,
      unit_amount: String(pkg.unit_amount),
      currency: "aed",
      tax_behavior: "exclusive",
    });
    results.push({ name: pkg.name, productId: product.id, priceId: price.id });
    console.log(`Created: ${pkg.name} — ${price.id}`);
  }

  console.log("\n--- Copy everything below back to Claude ---\n");
  console.log(JSON.stringify(results, null, 2));
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
