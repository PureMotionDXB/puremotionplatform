import { supabase } from "./supabase";

export interface InstructorRecord {
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  email: string | null;
}

interface InstructorRecordRow {
  first_name: string | null;
  last_name: string | null;
  date_of_birth: string | null;
  email: string | null;
}

export async function fetchInstructorRecord(
  instructorId: string,
): Promise<InstructorRecord | null> {
  const { data, error } = await supabase
    .from("instructor_records")
    .select("first_name, last_name, date_of_birth, email")
    .eq("instructor_id", instructorId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as InstructorRecordRow;
  return {
    firstName: row.first_name ?? "",
    lastName: row.last_name ?? "",
    dateOfBirth: row.date_of_birth,
    email: row.email,
  };
}

export async function saveInstructorRecord(
  instructorId: string,
  record: InstructorRecord,
): Promise<void> {
  const { error } = await supabase.from("instructor_records").upsert({
    instructor_id: instructorId,
    first_name: record.firstName || null,
    last_name: record.lastName || null,
    date_of_birth: record.dateOfBirth || null,
    email: record.email || null,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export interface InstructorDocument {
  id: string;
  label: string;
  storagePath: string;
  uploadedAt: string;
}

interface InstructorDocumentRow {
  id: string;
  label: string;
  storage_path: string;
  uploaded_at: string;
}

export async function fetchInstructorDocuments(
  instructorId: string,
): Promise<InstructorDocument[]> {
  const { data, error } = await supabase
    .from("instructor_documents")
    .select("id, label, storage_path, uploaded_at")
    .eq("instructor_id", instructorId)
    .order("uploaded_at", { ascending: false });
  if (error) throw error;
  return (data as InstructorDocumentRow[]).map((r) => ({
    id: r.id,
    label: r.label,
    storagePath: r.storage_path,
    uploadedAt: r.uploaded_at,
  }));
}

export async function uploadInstructorDocument(
  instructorId: string,
  label: string,
  file: File,
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const path = `${instructorId}/${crypto.randomUUID()}-${file.name}`;
  const { error: uploadError } = await supabase.storage
    .from("instructor-documents")
    .upload(path, file);
  if (uploadError) throw uploadError;

  const { error: insertError } = await supabase.from("instructor_documents").insert({
    instructor_id: instructorId,
    label,
    storage_path: path,
    uploaded_by: user.id,
  });
  if (insertError) throw insertError;
}

export async function deleteInstructorDocument(doc: InstructorDocument): Promise<void> {
  const { error: storageError } = await supabase.storage
    .from("instructor-documents")
    .remove([doc.storagePath]);
  if (storageError) throw storageError;

  const { error } = await supabase.from("instructor_documents").delete().eq("id", doc.id);
  if (error) throw error;
}

export async function getDocumentSignedUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from("instructor-documents")
    .createSignedUrl(storagePath, 60);
  if (error) throw error;
  return data.signedUrl;
}
