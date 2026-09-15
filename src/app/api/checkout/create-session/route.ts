import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { findPackage } from "@/lib/stripe-catalog";

export async function POST(request: Request) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!stripeSecretKey || !supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "Checkout is not configured yet" }, { status: 501 });
  }

  let packageKey: string | undefined;
  try {
    ({ packageKey } = await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (!packageKey) {
    return NextResponse.json({ error: "Missing packageKey" }, { status: 400 });
  }

  const pkg = findPackage(packageKey);
  if (!pkg) {
    return NextResponse.json({ error: "Unknown package" }, { status: 400 });
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

  const origin = new URL(request.url).origin;

  const params = new URLSearchParams();
  params.set("mode", "payment");
  params.set("line_items[0][price]", pkg.priceId);
  params.set("line_items[0][quantity]", "1");
  params.set("automatic_tax[enabled]", "true");
  params.set("customer_email", user.email ?? "");
  params.set("client_reference_id", user.id);
  params.set("metadata[client_id]", user.id);
  params.set("metadata[package_key]", pkg.key);
  params.set("success_url", `${origin}/account?purchase=success`);
  params.set("cancel_url", `${origin}/pricing?purchase=cancelled`);

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
