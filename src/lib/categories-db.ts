import { supabase } from "./supabase";
import type { ServiceCategory } from "./categories-data";

interface CategoryRow {
  id: string;
  name: string;
  color: string | null;
  display_order: number;
}

function fromRow(row: CategoryRow): ServiceCategory {
  return { id: row.id, name: row.name, color: row.color, displayOrder: row.display_order };
}

export async function fetchCategories(): Promise<ServiceCategory[]> {
  const { data, error } = await supabase
    .from("service_categories")
    .select("*")
    .order("display_order");
  if (error) throw error;
  return (data as CategoryRow[]).map(fromRow);
}

export async function insertCategory(category: ServiceCategory): Promise<ServiceCategory> {
  const { data, error } = await supabase
    .from("service_categories")
    .insert({
      id: category.id,
      name: category.name,
      color: category.color,
      display_order: category.displayOrder,
    })
    .select()
    .single();
  if (error) throw error;
  return fromRow(data as CategoryRow);
}

export async function updateCategory(
  id: string,
  fields: { name: string; color: string | null; displayOrder: number },
): Promise<void> {
  const { error } = await supabase
    .from("service_categories")
    .update({ name: fields.name, color: fields.color, display_order: fields.displayOrder })
    .eq("id", id);
  if (error) throw error;
}
