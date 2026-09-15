import { NextResponse, type NextRequest } from "next/server";
import { requireStaffAdmin } from "@/lib/admin-auth-server";
import { stripeRequest, StripeError } from "@/lib/stripe-server";

// Stripe prices are immutable — a repriced package gets a brand new
// Stripe Price on the same Product, with the old one archived (never
// deleted, since a past Checkout Session references its price ID
// directly regardless of later archiving).
export async function POST(request: NextRequest, ctx: RouteContext<"/api/admin/packages/[id]/price">) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    return NextResponse.json({ error: "Stripe is not configured yet" }, { status: 501 });
  }
  const auth = await requireStaffAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { supabase } = auth;
  const { id } = await ctx.params;

  let priceAed: number | undefined;
  try {
    ({ priceAed } = await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (priceAed == null || priceAed < 0) {
    return NextResponse.json({ error: "Invalid price" }, { status: 400 });
  }

  const { data: existing, error: fetchError } = await supabase
    .from("packages")
    .select("stripe_product_id, stripe_price_id")
    .eq("id", id)
    .maybeSingle();
  if (fetchError || !existing) {
    return NextResponse.json({ error: "Package not found" }, { status: 404 });
  }

  let newPriceId: string;
  try {
    await stripeRequest(stripeSecretKey, `prices/${existing.stripe_price_id}`, { active: "false" });
    const price = await stripeRequest(stripeSecretKey, "prices", {
      product: existing.stripe_product_id,
      unit_amount: String(Math.round(priceAed * 100)),
      currency: "aed",
      tax_behavior: "exclusive",
    });
    newPriceId = price.id as string;
  } catch (err) {
    const message = err instanceof StripeError ? err.message : "Failed to update Stripe price";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const { data, error } = await supabase
    .from("packages")
    .update({ stripe_price_id: newPriceId, price_aed: priceAed, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json(data);
}
