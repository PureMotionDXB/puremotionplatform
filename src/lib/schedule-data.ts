export type ClassFamily = "reformer" | "mat";

export interface ScheduledClass {
  id: string;
  day: number; // 0=Mon..6=Sun
  time: string;
  name: string;
  family: ClassFamily; // "Category" — which credit pool this class draws from
  creditCost: number; // "Pricing category" — credits a single booking consumes (usually 1)
  instructor: string; // instructor id, see `instructorsList`
  capacity: number;
  booked: number;
}

export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export interface Instructor {
  id: string;
  name: string;
}

// Placeholder instructor roster — editable from /admin/schedule, and
// ultimately backed by the database once it's connected.
export const defaultInstructors: Instructor[] = [
  { id: "leila", name: "Leila Haddad" },
  { id: "noor", name: "Noor Al Farsi" },
  { id: "sophie", name: "Sophie Bennett" },
  { id: "amira", name: "Amira Khoury" },
];

// Kept for components (like ClassCard) that just need id -> name.
export const instructors: Record<string, string> = Object.fromEntries(
  defaultInstructors.map((i) => [i.id, i.name]),
);

function family(name: string): ClassFamily {
  return name.startsWith("Reformer") ? "reformer" : "mat";
}

// [day, time, name, instructor, capacity, booked]
const seed: [number, string, string, string, number, number][] = [
  [0, "07:30", "Reformer Advanced", "leila", 10, 9],
  [0, "08:30", "Reformer Intermediate", "noor", 10, 10],
  [0, "09:30", "Reformer Intermediate", "noor", 10, 7],
  [0, "10:30", "Reformer All Levels", "sophie", 10, 8],
  [0, "11:30", "Reformer All Levels", "sophie", 10, 6],
  [0, "16:30", "Reformer Essentials", "amira", 10, 5],
  [0, "17:30", "Reformer Intermediate", "leila", 10, 9],
  [0, "18:30", "Reformer Advanced", "leila", 10, 10],
  [0, "19:00", "Deep Stretch", "amira", 8, 6],

  [1, "07:00", "Reformer Intermediate", "noor", 10, 8],
  [1, "08:00", "Full Body Burn", "amira", 8, 8],
  [1, "08:30", "Reformer All Levels", "sophie", 10, 9],
  [1, "09:30", "Reformer All Levels", "sophie", 10, 7],
  [1, "10:30", "Reformer Intermediate", "leila", 10, 10],
  [1, "11:30", "Reformer Intermediate", "leila", 10, 6],
  [1, "16:30", "Reformer Essentials", "amira", 10, 4],
  [1, "17:30", "Reformer All Levels", "noor", 10, 9],
  [1, "18:30", "Reformer Intermediate", "leila", 10, 8],

  [2, "07:30", "Reformer Intermediate", "noor", 10, 9],
  [2, "08:30", "Reformer Intermediate", "leila", 10, 10],
  [2, "09:30", "Reformer All Levels", "sophie", 10, 7],
  [2, "10:30", "Reformer Intermediate", "noor", 10, 6],
  [2, "11:30", "Reformer Intermediate", "leila", 10, 8],
  [2, "16:30", "Reformer All Levels", "sophie", 10, 5],
  [2, "17:30", "Reformer Intermediate", "noor", 10, 9],
  [2, "18:30", "Reformer Advanced", "amira", 10, 10],
  [2, "19:00", "Deep Stretch", "amira", 8, 5],

  [3, "07:00", "Reformer Advanced", "leila", 10, 8],
  [3, "08:30", "Reformer Intermediate", "noor", 10, 9],
  [3, "09:30", "Reformer Intermediate", "noor", 10, 7],
  [3, "10:30", "Reformer All Levels", "sophie", 10, 6],
  [3, "11:30", "Reformer All Levels", "sophie", 10, 8],
  [3, "16:30", "Reformer All Levels", "amira", 10, 9],
  [3, "17:30", "Reformer Intermediate", "leila", 10, 9],
  [3, "18:30", "Reformer Intermediate", "leila", 10, 2],

  [4, "07:00", "Reformer Intermediate", "noor", 10, 7],
  [4, "08:00", "Full Body Burn", "amira", 8, 7],
  [4, "08:30", "Reformer Advanced", "leila", 10, 10],
  [4, "09:30", "Reformer Essentials", "amira", 10, 6],
  [4, "10:30", "Reformer Intermediate", "noor", 10, 9],
  [4, "11:30", "Reformer Intermediate", "leila", 10, 8],
  [4, "12:30", "Reformer Intermediate", "sophie", 10, 5],
  [4, "13:30", "Reformer All Levels", "sophie", 10, 9],
  [4, "17:00", "Sound Healing", "amira", 8, 8],

  [5, "08:30", "Reformer Intermediate", "leila", 10, 9],
  [5, "09:30", "Reformer Intermediate", "noor", 10, 10],
  [5, "10:30", "Reformer Intermediate", "sophie", 10, 7],
  [5, "11:30", "Reformer All Levels", "sophie", 10, 8],
  [5, "12:30", "Reformer Intermediate", "amira", 10, 6],
  [5, "13:30", "Reformer All Levels", "leila", 10, 9],

  [6, "08:30", "Reformer Intermediate", "noor", 10, 5],
  [6, "09:30", "Reformer All Levels", "sophie", 10, 8],
  [6, "10:30", "Reformer Intermediate", "leila", 10, 6],
  [6, "11:30", "Reformer All Levels", "amira", 10, 7],
];

export const schedule: ScheduledClass[] = seed.map((row, i) => ({
  id: `c${i}`,
  day: row[0],
  time: row[1],
  name: row[2],
  family: family(row[2]),
  creditCost: 1,
  instructor: row[3],
  capacity: row[4],
  booked: row[5],
}));

export function emptyClass(): Omit<ScheduledClass, "id"> {
  return {
    day: 0,
    time: "08:00",
    name: "",
    family: "reformer",
    creditCost: 1,
    instructor: defaultInstructors[0]?.id ?? "",
    capacity: 10,
    booked: 0,
  };
}

export type SpotStatus = "good" | "warning" | "critical";

export function statusFor(cls: ScheduledClass): SpotStatus {
  const left = cls.capacity - cls.booked;
  if (left <= 0) return "critical";
  if (left <= 2) return "warning";
  return "good";
}

export function statusLabel(cls: ScheduledClass): string {
  const left = cls.capacity - cls.booked;
  if (left <= 0) return "Full";
  if (left <= 2) return `${left} left`;
  return `${left} open`;
}
