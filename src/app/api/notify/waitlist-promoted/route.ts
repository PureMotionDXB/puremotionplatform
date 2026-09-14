import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

interface BookingRow {
  status: string;
  client_id: string;
  class_occurrences: {
    date: string;
    classes: { name: string; time: string };
  } | null;
}

export async function POST(request: Request) {
  const resendApiKey = process.env.RESEND_API_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!resendApiKey || !supabaseUrl || !serviceRoleKey) {
    // Email isn't configured yet — fail quietly rather than break the
    // booking flow that called this.
    return NextResponse.json({ skipped: true, reason: "Email not configured" }, { status: 501 });
  }

  let bookingId: string | undefined;
  try {
    ({ bookingId } = await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (!bookingId) {
    return NextResponse.json({ error: "Missing bookingId" }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data: booking, error } = await supabase
    .from("bookings")
    .select("status, client_id, class_occurrences(date, classes(name, time))")
    .eq("id", bookingId)
    .maybeSingle();

  if (error || !booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }
  const row = booking as unknown as BookingRow;
  if (row.status !== "booked" || !row.class_occurrences) {
    return NextResponse.json({ error: "Booking is not in a promoted state" }, { status: 400 });
  }

  const { data: userData, error: userError } = await supabase.auth.admin.getUserById(row.client_id);
  if (userError || !userData.user?.email) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const { date, classes } = row.class_occurrences;
  const dateLabel = new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const emailRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Pure Motion <bookings@puremotion.ae>",
      to: [userData.user.email],
      subject: `You're in! A spot opened up in ${classes.name}`,
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; color: #1a1410;">
          <h1 style="font-size: 20px; margin-bottom: 8px;">You're off the waitlist!</h1>
          <p style="font-size: 14px; line-height: 1.5;">
            A spot opened up and you've been automatically booked into:
          </p>
          <p style="font-size: 16px; font-weight: bold; margin: 16px 0 4px;">${classes.name}</p>
          <p style="font-size: 14px; color: #6b5f56;">${dateLabel} at ${classes.time}</p>
          <p style="font-size: 13px; line-height: 1.5; margin-top: 20px; color: #6b5f56;">
            Can't make it? Cancel from your account at least 12 hours ahead to avoid a
            late-cancellation fee.
          </p>
          <p style="font-size: 14px; margin-top: 20px;">— Pure Motion</p>
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
