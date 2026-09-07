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

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);

const instructors = [
  { id: "leila", name: "Leila Haddad" },
  { id: "noor", name: "Noor Al Farsi" },
  { id: "sophie", name: "Sophie Bennett" },
  { id: "amira", name: "Amira Khoury" },
];

// [day, time, name, instructor, capacity, booked]
const seed = [
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

function family(name) {
  return name.startsWith("Reformer") ? "reformer" : "mat";
}

const { error: instructorsError } = await supabase
  .from("instructors")
  .upsert(instructors);
if (instructorsError) {
  console.error("Failed to seed instructors:", instructorsError.message);
  process.exit(1);
}

const rows = seed.map(([day, time, name, instructor, capacity, booked]) => ({
  day,
  time,
  name,
  family: family(name),
  credit_cost: 1,
  instructor_id: instructor,
  capacity,
  booked,
}));

const { error: classesError, data } = await supabase
  .from("classes")
  .insert(rows)
  .select();
if (classesError) {
  console.error("Failed to seed classes:", classesError.message);
  process.exit(1);
}

console.log(`Seeded ${instructors.length} instructors and ${data.length} classes.`);
