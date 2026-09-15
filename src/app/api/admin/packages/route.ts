import { NextResponse } from "next/server";
import { requireStaffAdmin } from "@/lib/admin-auth-server";
import { stripeRequest, StripeError } from "@/lib/stripe-server";

interface CreateBody {
  name?: string;
  family?: string;
  kind?: "credits" | "membership";
  creditAmount?: number | null;
  durationDays?: number | null;
  durationMonths?: number | null;
  priceAed?: number;
  displayTab?: "starter" | "credit" | "membership";
  displayOrder?: number;
  detail?: string | null;
  note?: string | null;
  singleClass?: boolean;
}

export async function POST(request: Request) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    return NextResponse.json({ error: "Stripe is not configured yet" }, { status: 501 });
  }

  const auth = await requireStaffAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { supabase, userId } = auth;

  let body: CreateBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { name, family, kind, creditAmount, durationDays, durationMonths, priceAed, displayTab } = body;
  if (!name?.trim() || !family || !kind || priceAed == null || priceAed < 0 || !displayTab) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (kind === "credits" && !(creditAmount && creditAmount > 0)) {
    return NextResponse.json({ error: "Credit amount must be greater than zero" }, { status: 400 });
  }
  if (kind === "membership" && !((durationDays && durationDays > 0) !== !(durationMonths && durationMonths > 0))) {
    return NextResponse.json(
      { error: "Membership packages need exactly one of a day or month duration" },
      { status: 400 },
    );
  }

  let stripeProductId: string;
  let stripePriceId: string;
  try {
    const product = await stripeRequest(stripeSecretKey, "products", { name });
    stripeProductId = product.id as string;
    const price = await stripeRequest(stripeSecretKey, "prices", {
      product: stripeProductId,
      unit_amount: String(Math.round(priceAed * 100)),
      currency: "aed",
      tax_behavior: "exclusive",
    });
    stripePriceId = price.id as string;
  } catch (err) {
    const message = err instanceof StripeError ? err.message : "Failed to create Stripe product/price";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const { data, error } = await supabase
    .from("packages")
    .insert({
      name: name.trim(),
      family,
      kind,
      credit_amount: kind === "credits" ? creditAmount : null,
      duration_days: kind === "membership" ? durationDays ?? null : null,
      duration_months: kind === "membership" ? durationMonths ?? null : null,
      price_aed: priceAed,
      stripe_product_id: stripeProductId,
      stripe_price_id: stripePriceId,
      display_tab: displayTab,
      display_order: body.displayOrder ?? 0,
      detail: body.detail ?? null,
      note: body.note ?? null,
      single_class: body.singleClass ?? false,
      created_by: userId,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json(data);
}
