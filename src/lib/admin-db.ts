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

export interface AdminOccurrenceView {
  occurrenceId: string;
  date: string;
  time: string;
  name: string;
  family: ClassFamily;
  ladiesOnly: boolean;
  instructor: string;
  capacity: number;
  bookedCount: number;
  waitlistCount: number;
  clientStatus: "none" | "booked" | "waitlisted";
  clientBookingId: string | null;
}

interface AdminOccurrenceRow {
  id: string;
  date: string;
  classes: {
    time: string;
    name: string;
    family: ClassFamily;
    ladies_only: boolean;
    instructor_id: string;
    capacity: number;
  };
}

interface AdminBookingCountRow {
  occurrence_id: string;
  status: string;
}

export async function fetchOccurrencesForClient(
  clientId: string,
  startDate: string,
  endDate: string,
): Promise<AdminOccurrenceView[]> {
  const { data: occurrenceRows, error } = await supabase
    .from("class_occurrences")
    .select("id, date, classes(time, name, family, ladies_only, instructor_id, capacity)")
    .gte("date", startDate)
    .lte("date", endDate);
  if (error) throw error;

  const rows = (occurrenceRows ?? []) as unknown as AdminOccurrenceRow[];
  const occurrenceIds = rows.map((r) => r.id);

  let counts: AdminBookingCountRow[] = [];
  let clientBookings: { id: string; occurrence_id: string; status: string }[] = [];
  if (occurrenceIds.length > 0) {
    const { data: bookingRows, error: bookingsError } = await supabase
      .from("bookings")
      .select("occurrence_id, status")
      .in("occurrence_id", occurrenceIds)
      .in("status", ["booked", "waitlisted"]);
    if (bookingsError) throw bookingsError;
    counts = (bookingRows ?? []) as AdminBookingCountRow[];

    const { data: clientRows, error: clientError } = await supabase
      .from("bookings")
      .select("id, occurrence_id, status")
      .eq("client_id", clientId)
      .in("occurrence_id", occurrenceIds)
      .in("status", ["booked", "waitlisted"]);
    if (clientError) throw clientError;
    clientBookings = clientRows ?? [];
  }

  return rows.map((row) => {
    const bookedCount = counts.filter(
      (c) => c.occurrence_id === row.id && c.status === "booked",
    ).length;
    const waitlistCount = counts.filter(
      (c) => c.occurrence_id === row.id && c.status === "waitlisted",
    ).length;
    const mine = clientBookings.find((b) => b.occurrence_id === row.id);
    return {
      occurrenceId: row.id,
      date: row.date,
      time: row.classes.time,
      name: row.classes.name,
      family: row.classes.family,
      ladiesOnly: row.classes.ladies_only,
      instructor: row.classes.instructor_id,
      capacity: row.classes.capacity,
      bookedCount,
      waitlistCount,
      clientStatus: mine ? (mine.status as "booked" | "waitlisted") : "none",
      clientBookingId: mine?.id ?? null,
    };
  });
}

export async function adminBookClass(
  clientId: string,
  occurrenceId: string,
): Promise<{ status: string }> {
  const { data, error } = await supabase.rpc("book_class", {
    p_occurrence_id: occurrenceId,
    p_client_id: clientId,
  });
  if (error) throw error;
  return data as { status: string };
}

export async function adminCancelBooking(bookingId: string): Promise<void> {
  const { error } = await supabase.rpc("cancel_booking", { p_booking_id: bookingId });
  if (error) throw error;
}

export interface ClassOccupancy {
  name: string;
  family: ClassFamily;
  sessions: number;
  totalCapacity: number;
  totalOccupied: number;
  occupancyPct: number;
  attended: number;
  noShow: number;
}

export interface OccupancyReport {
  totalClasses: number;
  totalCapacity: number;
  totalOccupied: number;
  totalAttended: number;
  totalNoShow: number;
  occupancyPct: number;
  attendanceRate: number | null;
  byClass: ClassOccupancy[];
}

interface ReportOccurrenceRow {
  id: string;
  date: string;
  classes: { name: string; family: ClassFamily; capacity: number };
}

interface ReportBookingRow {
  occurrence_id: string;
  status: "booked" | "attended" | "no_show";
}

export async function fetchOccupancyReport(
  startDate: string,
  endDate: string,
): Promise<OccupancyReport> {
  const { data: occRows, error } = await supabase
    .from("class_occurrences")
    .select("id, date, classes(name, family, capacity)")
    .gte("date", startDate)
    .lte("date", endDate);
  if (error) throw error;
  const occurrences = (occRows ?? []) as unknown as ReportOccurrenceRow[];
  const occurrenceIds = occurrences.map((o) => o.id);

  let bookingRows: ReportBookingRow[] = [];
  if (occurrenceIds.length > 0) {
    const { data, error: bookingsError } = await supabase
      .from("bookings")
      .select("occurrence_id, status")
      .in("occurrence_id", occurrenceIds)
      .in("status", ["booked", "attended", "no_show"]);
    if (bookingsError) throw bookingsError;
    bookingRows = (data ?? []) as ReportBookingRow[];
  }

  const byClassMap = new Map<string, ClassOccupancy>();
  let totalCapacity = 0;
  let totalOccupied = 0;
  let totalAttended = 0;
  let totalNoShow = 0;

  for (const occ of occurrences) {
    const bookingsForOcc = bookingRows.filter((b) => b.occurrence_id === occ.id);
    const occupied = bookingsForOcc.length;
    const attended = bookingsForOcc.filter((b) => b.status === "attended").length;
    const noShow = bookingsForOcc.filter((b) => b.status === "no_show").length;

    totalCapacity += occ.classes.capacity;
    totalOccupied += occupied;
    totalAttended += attended;
    totalNoShow += noShow;

    const existing = byClassMap.get(occ.classes.name);
    if (existing) {
      existing.sessions += 1;
      existing.totalCapacity += occ.classes.capacity;
      existing.totalOccupied += occupied;
      existing.attended += attended;
      existing.noShow += noShow;
    } else {
      byClassMap.set(occ.classes.name, {
        name: occ.classes.name,
        family: occ.classes.family,
        sessions: 1,
        totalCapacity: occ.classes.capacity,
        totalOccupied: occupied,
        occupancyPct: 0,
        attended,
        noShow,
      });
    }
  }

  const byClass = Array.from(byClassMap.values())
    .map((c) => ({
      ...c,
      occupancyPct: c.totalCapacity > 0 ? Math.round((c.totalOccupied / c.totalCapacity) * 100) : 0,
    }))
    .sort((a, b) => b.occupancyPct - a.occupancyPct);

  return {
    totalClasses: occurrences.length,
    totalCapacity,
    totalOccupied,
    totalAttended,
    totalNoShow,
    occupancyPct: totalCapacity > 0 ? Math.round((totalOccupied / totalCapacity) * 100) : 0,
    attendanceRate:
      totalAttended + totalNoShow > 0
        ? Math.round((totalAttended / (totalAttended + totalNoShow)) * 100)
        : null,
    byClass,
  };
}
