import { supabase } from "./supabase";

export type Segment = "never_attended" | "first_timer" | "active" | "lapsed" | "lost";

export const segmentLabel: Record<Segment, string> = {
  never_attended: "Signed up, never attended",
  first_timer: "First-timer (1 class)",
  active: "Active (visited in last 30 days)",
  lapsed: "Lapsed (30–90 days since last visit)",
  lost: "Lost (90+ days since last visit)",
};

export interface ClientSegment {
  id: string;
  fullName: string;
  phone: string | null;
  totalAttended: number;
  firstAttendedAt: string | null;
  lastAttendedAt: string | null;
  segment: Segment;
}

interface ClientRow {
  id: string;
  full_name: string;
  phone: string | null;
}

interface AttendedBookingRow {
  client_id: string;
  class_occurrences: { date: string } | null;
}

function daysAgo(dateStr: string): number {
  const then = new Date(`${dateStr}T00:00:00`).getTime();
  const now = new Date().getTime();
  return Math.floor((now - then) / (1000 * 60 * 60 * 24));
}

export async function fetchClientSegments(): Promise<ClientSegment[]> {
  const { data: clientRows, error: clientError } = await supabase
    .from("clients")
    .select("id, full_name, phone");
  if (clientError) throw clientError;

  const { data: bookingRows, error: bookingError } = await supabase
    .from("bookings")
    .select("client_id, class_occurrences(date)")
    .eq("status", "attended");
  if (bookingError) throw bookingError;

  const attended = (bookingRows ?? []) as unknown as AttendedBookingRow[];

  return (clientRows as ClientRow[]).map((c) => {
    const dates = attended
      .filter((b) => b.client_id === c.id && b.class_occurrences)
      .map((b) => b.class_occurrences!.date)
      .sort();

    const totalAttended = dates.length;
    const firstAttendedAt = dates[0] ?? null;
    const lastAttendedAt = dates[dates.length - 1] ?? null;

    let segment: Segment;
    if (totalAttended === 0) {
      segment = "never_attended";
    } else {
      const gap = daysAgo(lastAttendedAt!);
      if (gap > 90) segment = "lost";
      else if (gap > 30) segment = "lapsed";
      else segment = totalAttended === 1 ? "first_timer" : "active";
    }

    return {
      id: c.id,
      fullName: c.full_name,
      phone: c.phone,
      totalAttended,
      firstAttendedAt,
      lastAttendedAt,
      segment,
    };
  });
}

export function waLink(phone: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  return `https://wa.me/${digits}`;
}
