import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

async function newTestClient(n) {
  const email = `pm-waitlist-test-${n}@mailinator.com`;
  const password = "TestPassword123!";
  const supabase = createClient(url, key);
  let { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: `Waitlist Test ${n}`, gender: "unspecified" } },
  });
  if (error || !data.session) {
    // already registered from a previous run — sign in instead
    const signIn = await supabase.auth.signInWithPassword({ email, password });
    if (signIn.error) throw new Error(`signin ${n}: ${signIn.error.message}`);
    data = signIn.data;
  }
  // create the client row (normally done by the app's self-healing
  // fetchMyClient()) and grant credits, before the column lock-down
  // migration is applied
  const { error: upsertError } = await supabase.from("clients").upsert(
    {
      id: data.user.id,
      full_name: `Waitlist Test ${n}`,
      gender: "unspecified",
      reformer_credits: 3,
      mat_credits: 3,
    },
    { onConflict: "id" },
  );
  if (upsertError) throw new Error(`client upsert ${n}: ${upsertError.message}`);
  return { n, client: supabase, userId: data.user.id };
}

const admin = createClient(url, key);
const targetDate = new Date();
targetDate.setDate(targetDate.getDate() + 3);
const targetDateStr = targetDate.toISOString().slice(0, 10);
const { data: occRows, error: occError } = await admin
  .from("class_occurrences")
  .select("id, date, classes(name, capacity, family)")
  .gte("date", targetDateStr)
  .order("date", { ascending: true })
  .limit(1);
if (occError) throw occError;
const occurrenceId = occRows[0].id;
console.log("Testing against occurrence:", JSON.stringify(occRows[0]));

const capacity = occRows[0].classes.capacity;
const testers = [];
for (let i = 1; i <= capacity + 3; i++) {
  testers.push(await newTestClient(i));
}

// Each tester can only read their OWN bookings via RLS (as it should
// be) — so fetch each one's own booking id/status through their own
// session rather than a privileged "admin" query.
for (const t of testers) {
  const { data, error } = await t.client.rpc("book_class", { p_occurrence_id: occurrenceId });
  t.bookStatus = data?.status;
  t.bookError = error?.message;
  if (!t.bookError) {
    const { data: myBooking } = await t.client
      .from("bookings")
      .select("id, status")
      .eq("occurrence_id", occurrenceId)
      .eq("client_id", t.userId)
      .in("status", ["booked", "waitlisted"])
      .single();
    t.bookingId = myBooking?.id;
  }
}
console.log(
  "Booking results:",
  JSON.stringify(
    testers.map((t) => ({ n: t.n, status: t.bookStatus, error: t.bookError })),
    null,
    2,
  ),
);
console.log(
  "Counts — booked:",
  testers.filter((t) => t.bookStatus === "booked").length,
  "waitlisted:",
  testers.filter((t) => t.bookStatus === "waitlisted").length,
  "rejected:",
  testers.filter((t) => t.bookError).length,
);

// Cancel the FIRST booked person, confirm the FIRST waitlisted person gets promoted.
const firstBooked = testers.find((t) => t.bookStatus === "booked");
const firstWaitlisted = testers.find((t) => t.bookStatus === "waitlisted");
const { data: cancelResult, error: cancelError } = await firstBooked.client.rpc(
  "cancel_booking",
  { p_booking_id: firstBooked.bookingId },
);
console.log("Cancel result:", JSON.stringify(cancelResult), cancelError?.message);

const { data: promotedRow } = await firstWaitlisted.client
  .from("bookings")
  .select("status")
  .eq("id", firstWaitlisted.bookingId)
  .single();
console.log(
  "First-waitlisted client status after cancellation (expect 'booked'):",
  promotedRow.status,
);

const { data: cancellerCredits } = await firstBooked.client
  .from("clients")
  .select("reformer_credits")
  .eq("id", firstBooked.userId)
  .single();
console.log(
  "Canceller's reformer credits after refund (expect 3, unchanged since outside 12h):",
  cancellerCredits.reformer_credits,
);

const { data: promotedCredits } = await firstWaitlisted.client
  .from("clients")
  .select("reformer_credits")
  .eq("id", firstWaitlisted.userId)
  .single();
console.log(
  "Promoted client's reformer credits after being charged (expect 2, started at 3):",
  promotedCredits.reformer_credits,
);
