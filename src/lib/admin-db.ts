import { supabase } from "./supabase";
import type { ClassFamily } from "./schedule-data";

export interface StaffInfo {
  role: "admin" | "instructor";
  instructorId: string | null;
}

export async function fetchMyStaffInfo(): Promise<StaffInfo | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("staff")
    .select("role, instructor_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { role: data.role, instructorId: data.instructor_id };
}

export interface AdminClient {
  id: string;
  fullName: string;
  phone: string | null;
  gender: string;
  reformerCredits: number;
  matCredits: number;
  createdAt: string;
}

interface AdminClientRow {
  id: string;
  full_name: string;
  phone: string | null;
  gender: string;
  reformer_credits: number;
  mat_credits: number;
  created_at: string;
}

export async function fetchAllClients(): Promise<AdminClient[]> {
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .order("full_name", { ascending: true });
  if (error) throw error;
  return (data as AdminClientRow[]).map((row) => ({
    id: row.id,
    fullName: row.full_name,
    phone: row.phone,
    gender: row.gender,
    reformerCredits: row.reformer_credits,
    matCredits: row.mat_credits,
    createdAt: row.created_at,
  }));
}

export async function adjustCredits(
  clientId: string,
  family: "reformer" | "mat",
  delta: number,
  reason: string,
): Promise<void> {
  const { error } = await supabase.rpc("adjust_credits", {
    p_client_id: clientId,
    p_family: family,
    p_delta: delta,
    p_reason: reason || null,
  });
  if (error) throw error;
}

export interface RosterBooking {
  id: string;
  status: "booked" | "waitlisted" | "attended" | "no_show";
  clientName: string;
  clientPhone: string | null;
}

export interface RosterEntry {
  occurrenceId: string;
  time: string;
  name: string;
  family: ClassFamily;
  ladiesOnly: boolean;
  capacity: number;
  instructor: string;
  bookings: RosterBooking[];
}

interface RosterOccurrenceRow {
  id: string;
  classes: {
    time: string;
    name: string;
    family: ClassFamily;
    ladies_only: boolean;
    capacity: number;
    instructor_id: string;
  };
}

interface RosterBookingRow {
  id: string;
  occurrence_id: string;
  status: "booked" | "waitlisted" | "attended" | "no_show";
  clients: {
    full_name: string;
    phone: string | null;
  };
}

export async function fetchRoster(date: string): Promise<RosterEntry[]> {
  const { data: occurrenceRows, error } = await supabase
    .from("class_occurrences")
    .select("id, classes(time, name, family, ladies_only, capacity, instructor_id)")
    .eq("date", date);
  if (error) throw error;

  const occurrences = (occurrenceRows ?? []) as unknown as RosterOccurrenceRow[];
  const occurrenceIds = occurrences.map((o) => o.id);

  let bookingRows: RosterBookingRow[] = [];
  if (occurrenceIds.length > 0) {
    const { data, error: bookingsError } = await supabase
      .from("bookings")
      .select("id, occurrence_id, status, clients(full_name, phone)")
      .in("occurrence_id", occurrenceIds)
      .in("status", ["booked", "waitlisted", "attended", "no_show"]);
    if (bookingsError) throw bookingsError;
    bookingRows = (data ?? []) as unknown as RosterBookingRow[];
  }

  return occurrences
    .map((occ) => ({
      occurrenceId: occ.id,
      time: occ.classes.time,
      name: occ.classes.name,
      family: occ.classes.family,
      ladiesOnly: occ.classes.ladies_only,
      capacity: occ.classes.capacity,
      instructor: occ.classes.instructor_id,
      bookings: bookingRows
        .filter((b) => b.occurrence_id === occ.id)
        .map((b) => ({
          id: b.id,
          status: b.status,
          clientName: b.clients.full_name,
          clientPhone: b.clients.phone,
        })),
    }))
    .sort((a, b) => a.time.localeCompare(b.time));
}

export async function setAttendance(bookingId: string, attended: boolean): Promise<void> {
  const { error } = await supabase.rpc("set_attendance", {
    p_booking_id: bookingId,
    p_attended: attended,
  });
  if (error) throw error;
}

export async function markNoShow(bookingId: string): Promise<void> {
  const { error } = await supabase.rpc("mark_no_show", { p_booking_id: bookingId });
  if (error) throw error;
}

export async function undoNoShow(bookingId: string): Promise<void> {
  const { error } = await supabase.rpc("undo_no_show", { p_booking_id: bookingId });
  if (error) throw error;
}

export interface OutstandingFee {
  id: string;
  clientId: string;
  clientName: string;
  reason: "no_show" | "late_cancel";
  amountAed: number;
  createdAt: string;
}

interface FeeRow {
  id: string;
  client_id: string;
  reason: "no_show" | "late_cancel";
  amount_aed: number;
  created_at: string;
  clients: { full_name: string };
}

export async function fetchOutstandingFees(): Promise<OutstandingFee[]> {
  const { data, error } = await supabase
    .from("no_show_fees")
    .select("id, client_id, reason, amount_aed, created_at, clients(full_name)")
    .eq("collected", false)
    .eq("waived", false)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as unknown as FeeRow[];
  return rows.map((r) => ({
    id: r.id,
    clientId: r.client_id,
    clientName: r.clients.full_name,
    reason: r.reason,
    amountAed: r.amount_aed,
    createdAt: r.created_at,
  }));
}

export async function resolveFee(feeId: string, collected: boolean): Promise<void> {
  const { error } = await supabase.rpc("resolve_fee", {
    p_fee_id: feeId,
    p_collected: collected,
  });
  if (error) throw error;
}
