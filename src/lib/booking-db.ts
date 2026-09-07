import { supabase } from "./supabase";
import type { ClassFamily } from "./schedule-data";

export interface OccurrenceView {
  occurrenceId: string;
  classId: string;
  date: string;
  time: string;
  name: string;
  family: ClassFamily;
  ladiesOnly: boolean;
  instructor: string;
  capacity: number;
  bookedCount: number;
  waitlistCount: number;
  myStatus: "none" | "booked" | "waitlisted";
  myBookingId: string | null;
}

export async function ensureOccurrences(weeksAhead = 3): Promise<void> {
  const { error } = await supabase.rpc("generate_occurrences", { weeks_ahead: weeksAhead });
  if (error) throw error;
}

interface OccurrenceRow {
  id: string;
  date: string;
  class_id: string;
  classes: {
    time: string;
    name: string;
    family: ClassFamily;
    ladies_only: boolean;
    instructor_id: string;
    capacity: number;
  };
}

interface BookingCountRow {
  occurrence_id: string;
  status: string;
}

export async function fetchOccurrences(
  startDate: string,
  endDate: string,
): Promise<OccurrenceView[]> {
  const { data: occurrenceRows, error } = await supabase
    .from("class_occurrences")
    .select("id, date, class_id, classes(time, name, family, ladies_only, instructor_id, capacity)")
    .gte("date", startDate)
    .lte("date", endDate);
  if (error) throw error;

  const rows = (occurrenceRows ?? []) as unknown as OccurrenceRow[];
  const occurrenceIds = rows.map((r) => r.id);

  let counts: BookingCountRow[] = [];
  if (occurrenceIds.length > 0) {
    const { data: bookingRows, error: bookingsError } = await supabase
      .from("bookings")
      .select("occurrence_id, status")
      .in("occurrence_id", occurrenceIds)
      .in("status", ["booked", "waitlisted"]);
    if (bookingsError) throw bookingsError;
    counts = (bookingRows ?? []) as BookingCountRow[];
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let myBookings: { id: string; occurrence_id: string; status: string }[] = [];
  if (user && occurrenceIds.length > 0) {
    const { data: myRows, error: myError } = await supabase
      .from("bookings")
      .select("id, occurrence_id, status")
      .eq("client_id", user.id)
      .in("occurrence_id", occurrenceIds)
      .in("status", ["booked", "waitlisted"]);
    if (myError) throw myError;
    myBookings = myRows ?? [];
  }

  return rows.map((row) => {
    const bookedCount = counts.filter(
      (c) => c.occurrence_id === row.id && c.status === "booked",
    ).length;
    const waitlistCount = counts.filter(
      (c) => c.occurrence_id === row.id && c.status === "waitlisted",
    ).length;
    const mine = myBookings.find((b) => b.occurrence_id === row.id);
    return {
      occurrenceId: row.id,
      classId: row.class_id,
      date: row.date,
      time: row.classes.time,
      name: row.classes.name,
      family: row.classes.family,
      ladiesOnly: row.classes.ladies_only,
      instructor: row.classes.instructor_id,
      capacity: row.classes.capacity,
      bookedCount,
      waitlistCount,
      myStatus: mine ? (mine.status as "booked" | "waitlisted") : "none",
      myBookingId: mine?.id ?? null,
    };
  });
}

export async function bookClass(occurrenceId: string): Promise<{ status: string }> {
  const { data, error } = await supabase.rpc("book_class", {
    p_occurrence_id: occurrenceId,
  });
  if (error) throw error;
  return data as { status: string };
}

export async function cancelBooking(bookingId: string): Promise<void> {
  const { error } = await supabase.rpc("cancel_booking", { p_booking_id: bookingId });
  if (error) throw error;
}

export interface ClientProfile {
  id: string;
  fullName: string;
  phone: string | null;
  gender: "female" | "male" | "unspecified";
  reformerCredits: number;
  matCredits: number;
}

interface ClientRow {
  id: string;
  full_name: string;
  phone: string | null;
  gender: "female" | "male" | "unspecified";
  reformer_credits: number;
  mat_credits: number;
}

// Signup can't always write the clients row immediately (Supabase may
// require email confirmation before a session exists), so the profile
// data collected at signup is stashed in auth user_metadata instead.
// The first time we see an authenticated user with no clients row yet,
// we create it here from that metadata.
export async function fetchMyClient(): Promise<ClientProfile | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw error;

  if (data) {
    const row = data as ClientRow;
    return {
      id: row.id,
      fullName: row.full_name,
      phone: row.phone,
      gender: row.gender,
      reformerCredits: row.reformer_credits,
      matCredits: row.mat_credits,
    };
  }

  const meta = user.user_metadata as {
    full_name?: string;
    phone?: string;
    gender?: "female" | "male" | "unspecified";
  };
  // upsert (not insert) because two concurrent calls can both see "no row
  // yet" and race to create one — e.g. React Strict Mode double-invoking
  // this on mount in development.
  const { data: created, error: createError } = await supabase
    .from("clients")
    .upsert(
      {
        id: user.id,
        full_name: meta.full_name ?? "",
        phone: meta.phone ?? null,
        gender: meta.gender ?? "unspecified",
      },
      { onConflict: "id" },
    )
    .select()
    .single();
  if (createError) throw createError;
  const row = created as ClientRow;
  return {
    id: row.id,
    fullName: row.full_name,
    phone: row.phone,
    gender: row.gender,
    reformerCredits: row.reformer_credits,
    matCredits: row.mat_credits,
  };
}

export interface MyBooking {
  id: string;
  status: "booked" | "waitlisted" | "cancelled" | "attended";
  date: string;
  time: string;
  name: string;
  family: ClassFamily;
}

interface MyBookingRow {
  id: string;
  status: "booked" | "waitlisted" | "cancelled" | "attended";
  class_occurrences: {
    date: string;
    classes: {
      time: string;
      name: string;
      family: ClassFamily;
    };
  };
}

export async function fetchMyBookings(): Promise<MyBooking[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from("bookings")
    .select("id, status, class_occurrences(date, classes(time, name, family))")
    .eq("client_id", user.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as unknown as MyBookingRow[];
  return rows.map((row) => ({
    id: row.id,
    status: row.status,
    date: row.class_occurrences.date,
    time: row.class_occurrences.classes.time,
    name: row.class_occurrences.classes.name,
    family: row.class_occurrences.classes.family,
  }));
}
