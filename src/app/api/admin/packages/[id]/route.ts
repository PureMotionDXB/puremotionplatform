import { NextResponse, type NextRequest } from "next/server";
import { requireStaffAdmin } from "@/lib/admin-auth-server";
import { stripeRequest, StripeError } from "@/lib/stripe-server";

interface PatchBody {
  name?: string;
  family?: string;
  displayTab?: "starter" | "credit" | "membership";
  displayOrder?: number;
  detail?: string | null;
  note?: string | null;
  singleClass?: boolean;
  active?: boolean;
}

// Metadata-only edits. Price changes go through the sibling
// price/route.ts — Stripe prices are immutable, so repricing is a
// distinct operation (archive + create new), not a field update.
export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/admin/packages/[id]">) {
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

  let body: PatchBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { data: existing, error: fetchError } = await supabase
    .from("packages")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (fetchError || !existing) {
    return NextResponse.json({ error: "Package not found" }, { status: 404 });
  }

  // Stripe products (unlike prices) are mutable — keep the name in sync.
  if (body.name && body.name.trim() && body.name.trim() !== existing.name) {
    try {
      await stripeRequest(stripeSecretKey, `products/${existing.stripe_product_id}`, {
        name: body.name.trim(),
      });
    } catch (err) {
      const message = err instanceof StripeError ? err.message : "Failed to rename Stripe product";
      return NextResponse.json({ error: message }, { status: 502 });
    }
  }

  // Archiving/reactivating a package archives/reactivates its Stripe
  // price too, so it can't (or can again) be selected for a new
  // checkout — safe either way since past sessions reference price
  // IDs directly, unaffected by later archiving.
  if (body.active !== undefined && body.active !== existing.active) {
    try {
      await stripeRequest(stripeSecretKey, `prices/${existing.stripe_price_id}`, {
        active: body.active ? "true" : "false",
      });
    } catch (err) {
      const message = err instanceof StripeError ? err.message : "Failed to update Stripe price";
      return NextResponse.json({ error: message }, { status: 502 });
    }
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.name !== undefined) patch.name = body.name.trim();
  if (body.family !== undefined) patch.family = body.family;
  if (body.displayTab !== undefined) patch.display_tab = body.displayTab;
  if (body.displayOrder !== undefined) patch.display_order = body.displayOrder;
  if (body.detail !== undefined) patch.detail = body.detail;
  if (body.note !== undefined) patch.note = body.note;
  if (body.singleClass !== undefined) patch.single_class = body.singleClass;
  if (body.active !== undefined) patch.active = body.active;

  const { data, error } = await supabase.from("packages").update(patch).eq("id", id).select().single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json(data);
}
