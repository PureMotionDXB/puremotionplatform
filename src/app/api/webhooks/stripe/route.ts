import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHmac, timingSafeEqual } from "node:crypto";

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
  const packageId: string | undefined = session.metadata?.package_id;
  if (!clientId || !packageId) {
    return NextResponse.json({ error: "Missing metadata on session" }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Service-role client, so this sees archived packages too — correct,
  // in case a package was archived between purchase and webhook delivery.
  const { data: pkg, error: pkgError } = await supabase
    .from("packages")
    .select("*")
    .eq("id", packageId)
    .maybeSingle();
  if (pkgError || !pkg) {
    return NextResponse.json({ error: "Unknown package in session metadata" }, { status: 400 });
  }

  if (pkg.kind === "credits") {
    const { error: grantError } = await supabase.rpc("grant_credits_for_client", {
      p_client_id: clientId,
      p_family: pkg.family,
      p_amount: pkg.credit_amount,
      p_reason: `Online purchase: ${pkg.name} (Stripe)`,
    });
    if (grantError) {
      return NextResponse.json({ error: grantError.message }, { status: 500 });
    }

    // "Pay for this exact class" flow — the credit above already
    // landed, so if the booking itself fails (e.g. the class filled
    // up between checkout and payment completing) the client still
    // keeps the credit and can book manually; nothing is lost, so
    // this is logged rather than failing the whole webhook.
    const occurrenceId: string | undefined = session.metadata?.occurrence_id;
    if (occurrenceId) {
      const { error: bookError } = await supabase.rpc("book_class_for_client", {
        p_client_id: clientId,
        p_occurrence_id: occurrenceId,
      });
      if (bookError) {
        console.error("book_class_for_client failed after credit grant:", bookError.message);
      }
    }
  } else if (pkg.kind === "membership") {
    const startsAt = new Date().toISOString().slice(0, 10);
    const endsAt = addDuration(startsAt, pkg.duration_days ?? undefined, pkg.duration_months ?? undefined);
    const { error: insertError } = await supabase.from("client_memberships").insert({
      client_id: clientId,
      family: pkg.family,
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
