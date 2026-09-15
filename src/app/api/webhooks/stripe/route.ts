import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHmac, timingSafeEqual } from "node:crypto";
import { findPackage } from "@/lib/stripe-catalog";

// Manual signature verification (no `stripe` package) — same
// approach as the rest of this app's Stripe integration. Stripe's
// algorithm: https://docs.stripe.com/webhooks#verify-manually
function verifyStripeSignature(rawBody: string, signatureHeader: string, secret: string): boolean {
  const parts = Object.fromEntries(
    signatureHeader.split(",").map((part) => part.split("=") as [string, string]),
  );
  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) return false;

  // 5 minute tolerance against replay attacks.
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (age > 300) return false;

  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  const expectedBuf = Buffer.from(expected, "hex");
  const actualBuf = Buffer.from(signature, "hex");
  if (expectedBuf.length !== actualBuf.length) return false;
  return timingSafeEqual(expectedBuf, actualBuf);
}

function addDuration(startIso: string, days?: number, months?: number): string {
  const d = new Date(`${startIso}T00:00:00`);
  if (days) d.setDate(d.getDate() + days - 1);
  if (months) {
    d.setMonth(d.getMonth() + months);
    d.setDate(d.getDate() - 1);
  }
  return d.toISOString().slice(0, 10);
}

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!webhookSecret || !supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 501 });
  }

  const rawBody = await request.text();
  const signatureHeader = request.headers.get("stripe-signature");
  if (!signatureHeader || !verifyStripeSignature(rawBody, signatureHeader, webhookSecret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const event = JSON.parse(rawBody);

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object;
  const clientId: string | undefined = session.metadata?.client_id;
  const packageKey: string | undefined = session.metadata?.package_key;
  if (!clientId || !packageKey) {
    return NextResponse.json({ error: "Missing metadata on session" }, { status: 400 });
  }

  const pkg = findPackage(packageKey);
  if (!pkg) {
    return NextResponse.json({ error: "Unknown package in session metadata" }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  if (pkg.credits) {
    const column = pkg.credits.family === "reformer" ? "reformer_credits" : "mat_credits";
    const { data: client, error: fetchError } = await supabase
      .from("clients")
      .select(column)
      .eq("id", clientId)
      .maybeSingle();
    if (fetchError || !client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }
    const current = (client as unknown as Record<string, number>)[column] ?? 0;
    const { error: updateError } = await supabase
      .from("clients")
      .update({ [column]: current + pkg.credits.amount })
      .eq("id", clientId);
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    await supabase.from("credit_adjustments").insert({
      client_id: clientId,
      family: pkg.credits.family,
      delta: pkg.credits.amount,
      reason: `Online purchase: ${pkg.name} (Stripe)`,
      created_by: clientId,
    });
  } else if (pkg.membership) {
    const startsAt = new Date().toISOString().slice(0, 10);
    const endsAt = addDuration(startsAt, pkg.membership.durationDays, pkg.membership.durationMonths);
    const { error: insertError } = await supabase.from("client_memberships").insert({
      client_id: clientId,
      family: pkg.membership.family,
      starts_at: startsAt,
      ends_at: endsAt,
      package_name: pkg.name,
      created_by: clientId,
    });
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
