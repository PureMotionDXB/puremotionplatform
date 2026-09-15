import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function POST(request: Request) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!stripeSecretKey || !supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "Checkout is not configured yet" }, { status: 501 });
  }

  let packageId: string | undefined;
  let occurrenceId: string | undefined;
  try {
    ({ packageId, occurrenceId } = await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (!packageId && !occurrenceId) {
    return NextResponse.json({ error: "Missing packageId or occurrenceId" }, { status: 400 });
  }

  // Identify the signed-in client from their own session cookies —
  // this route never trusts a client-supplied client ID.
  const cookieStore = await cookies();
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  // "Pay for this exact class" flow: the family (and therefore price)
  // is looked up server-side from the occurrence, never trusting a
  // client-supplied packageId, so a client can't pay the mat price to
  // book a reformer class or vice versa.
  if (occurrenceId) {
    const { data: occurrence, error: occurrenceError } = await supabase
      .from("class_occurrences")
      .select("classes(family)")
      .eq("id", occurrenceId)
      .maybeSingle();
    if (occurrenceError || !occurrence) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }
    const family = (occurrence as unknown as { classes: { family: string } }).classes.family;
    const { data: singleClassPkg, error: singleClassError } = await supabase
      .from("packages")
      .select("id")
      .eq("family", family)
      .eq("single_class", true)
      .eq("active", true)
      .maybeSingle();
    if (singleClassError || !singleClassPkg) {
      return NextResponse.json(
        { error: "No single-class option configured for this category — contact the studio" },
        { status: 400 },
      );
    }
    packageId = singleClassPkg.id;
  }

  const { data: pkg, error: pkgError } = await supabase
    .from("packages")
    .select("id, name, stripe_price_id")
    .eq("id", packageId)
    .eq("active", true)
    .maybeSingle();
  if (pkgError || !pkg) {
    return NextResponse.json({ error: "Unknown package" }, { status: 400 });
  }

  const origin = new URL(request.url).origin;

  const params = new URLSearchParams();
  params.set("mode", "payment");
  params.set("line_items[0][price]", pkg.stripe_price_id);
  params.set("line_items[0][quantity]", "1");
  params.set("automatic_tax[enabled]", "true");
  params.set("customer_email", user.email ?? "");
  params.set("client_reference_id", user.id);
  params.set("metadata[client_id]", user.id);
  params.set("metadata[package_id]", pkg.id);
  if (occurrenceId) {
    params.set("metadata[occurrence_id]", occurrenceId);
    params.set("success_url", `${origin}/schedule?booked=success`);
    params.set("cancel_url", `${origin}/schedule?purchase=cancelled`);
  } else {
    params.set("success_url", `${origin}/account?purchase=success`);
    params.set("cancel_url", `${origin}/pricing?purchase=cancelled`);
  }

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${stripeSecretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });
  const session = await res.json();

  if (!res.ok) {
    return NextResponse.json(
      { error: session.error?.message ?? "Failed to create checkout session" },
      { status: 502 },
    );
  }

  return NextResponse.json({ url: session.url });
}
