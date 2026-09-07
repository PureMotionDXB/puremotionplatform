import { supabase } from "./supabase";
import type { Instructor, ScheduledClass } from "./schedule-data";

interface ClassRow {
  id: string;
  day: number;
  time: string;
  name: string;
  family: "reformer" | "mat";
  ladies_only: boolean;
  credit_cost: number;
  instructor_id: string;
  capacity: number;
  booked: number;
}

function fromRow(row: ClassRow): ScheduledClass {
  return {
    id: row.id,
    day: row.day,
    time: row.time,
    name: row.name,
    family: row.family,
    ladiesOnly: row.ladies_only,
    creditCost: row.credit_cost,
    instructor: row.instructor_id,
    capacity: row.capacity,
    booked: row.booked,
  };
}

function toRow(cls: Omit<ScheduledClass, "id">) {
  return {
    day: cls.day,
    time: cls.time,
    name: cls.name,
    family: cls.family,
    ladies_only: cls.ladiesOnly,
    credit_cost: cls.creditCost,
    instructor_id: cls.instructor,
    capacity: cls.capacity,
    booked: cls.booked,
  };
}

export async function fetchClasses(): Promise<ScheduledClass[]> {
  const { data, error } = await supabase
    .from("classes")
    .select("*")
    .order("day")
    .order("time");
  if (error) throw error;
  return (data as ClassRow[]).map(fromRow);
}

export async function fetchInstructors(): Promise<Instructor[]> {
  const { data, error } = await supabase.from("instructors").select("*").order("name");
  if (error) throw error;
  return data as Instructor[];
}

export async function insertClass(cls: Omit<ScheduledClass, "id">): Promise<ScheduledClass> {
  const { data, error } = await supabase
    .from("classes")
    .insert(toRow(cls))
    .select()
    .single();
  if (error) throw error;
  return fromRow(data as ClassRow);
}

export async function updateClass(
  id: string,
  cls: Omit<ScheduledClass, "id">,
): Promise<void> {
  const { error } = await supabase.from("classes").update(toRow(cls)).eq("id", id);
  if (error) throw error;
}

export async function deleteClass(id: string): Promise<void> {
  const { error } = await supabase.from("classes").delete().eq("id", id);
  if (error) throw error;
}

export async function insertInstructor(instructor: Instructor): Promise<void> {
  const { error } = await supabase.from("instructors").insert(instructor);
  if (error) throw error;
}
