export type ClassFamily = "reformer" | "mat";

export interface ScheduledClass {
  id: string;
  day: number; // 0=Mon..6=Sun
  time: string;
  name: string;
  family: ClassFamily; // "Category" — which credit pool this class draws from
  ladiesOnly: boolean;
  creditCost: number; // "Pricing category" — credits a single booking consumes (usually 1)
  instructor: string; // instructor id, see the instructors table
  capacity: number;
  booked: number;
}

export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export interface Instructor {
  id: string;
  name: string;
}

export function emptyClass(defaultInstructorId = ""): Omit<ScheduledClass, "id"> {
  return {
    day: 0,
    time: "08:00",
    name: "",
    family: "reformer",
    ladiesOnly: false,
    creditCost: 1,
    instructor: defaultInstructorId,
    capacity: 10,
    booked: 0,
  };
}

export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}

// Supabase/PostgREST errors (including RPC errors) are plain objects
// with a `message` field, not real `Error` instances, so a bare
// `instanceof Error` check misses them and falls back to a generic
// message. This checks both shapes.
export function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err) {
    const message = (err as { message: unknown }).message;
    if (typeof message === "string" && message) return message;
  }
  return fallback;
}

export type SpotStatus = "good" | "warning" | "critical";

interface Occupancy {
  capacity: number;
  booked: number;
}

export function statusFor(cls: Occupancy): SpotStatus {
  const left = cls.capacity - cls.booked;
  if (left <= 0) return "critical";
  if (left <= 2) return "warning";
  return "good";
}

export function statusLabel(cls: Occupancy): string {
  const left = cls.capacity - cls.booked;
  if (left <= 0) return "Full";
  if (left <= 2) return `${left} left`;
  return `${left} open`;
}
