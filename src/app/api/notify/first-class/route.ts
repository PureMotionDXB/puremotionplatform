import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  const resendApiKey = process.env.RESEND_API_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!resendApiKey || !supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ skipped: true, reason: "Email not configured" }, { status: 501 });
  }

  let clientId: string | undefined;
  try {
    ({ clientId } = await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (!clientId) {
    return NextResponse.json({ error: "Missing clientId" }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("full_name")
    .eq("id", clientId)
    .maybeSingle();
  if (clientError || !client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const { data: userData, error: userError } = await supabase.auth.admin.getUserById(clientId);
  if (userError || !userData.user?.email) {
    return NextResponse.json({ error: "Client email not found" }, { status: 404 });
  }

  const firstName = (client.full_name as string)?.split(" ")[0] || "there";
  const pricingUrl = `${new URL(request.url).origin}/pricing`;

  const emailRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Pure Motion <hello@puremotion.ae>",
      to: [userData.user.email],
      subject: "Thank you for your first class at Pure Motion!",
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; color: #1a1410;">
          <h1 style="font-size: 20px; margin-bottom: 8px;">Thank you, ${firstName}!</h1>
          <p style="font-size: 14px; line-height: 1.6;">
            We loved having you at your first class. Hope you felt the burn (in a good way!).
          </p>
          <p style="font-size: 14px; line-height: 1.6;">
            Ready to make it a habit? Here's a taste of what's on offer:
          </p>
          <div style="margin: 20px 0; padding: 16px; border: 1px solid #e5ddd3; border-radius: 12px;">
            <p style="font-size: 13px; font-weight: bold; margin: 0 0 4px;">Reformer Starter Pack — AED 299 + VAT</p>
            <p style="font-size: 12.5px; color: #6b5f56; margin: 0 0 14px;">3 Credits (+1 FREE) — Valid for 2 Weeks</p>
            <p style="font-size: 13px; font-weight: bold; margin: 0 0 4px;">Mat Starter Pack — AED 255 + VAT</p>
            <p style="font-size: 12.5px; color: #6b5f56; margin: 0;">3 Credits — Valid for 2 Weeks</p>
          </div>
          <a
            href="${pricingUrl}"
            style="display: inline-block; background: #c8814f; color: #fff; font-size: 13px; font-weight: bold; padding: 10px 18px; border-radius: 9px; text-decoration: none;"
          >
            See all packages &amp; memberships
          </a>
          <p style="font-size: 13px; margin-top: 24px;">See you on the mat (or reformer!) soon.</p>
          <p style="font-size: 14px; margin-top: 4px;">— Pure Motion</p>
        </div>
      `,
    }),
  });

  if (!emailRes.ok) {
    const text = await emailRes.text();
    return NextResponse.json({ error: `Email failed to send: ${text}` }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
