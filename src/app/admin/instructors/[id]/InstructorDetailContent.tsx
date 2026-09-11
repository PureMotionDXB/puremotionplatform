"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getErrorMessage, type Instructor } from "@/lib/schedule-data";
import { fetchInstructor, updateInstructor } from "@/lib/schedule-db";
import {
  deleteInstructorDocument,
  fetchInstructorDocuments,
  fetchInstructorRecord,
  getDocumentSignedUrl,
  saveInstructorRecord,
  uploadInstructorDocument,
  type InstructorDocument,
  type InstructorRecord,
} from "@/lib/instructor-db";

const emptyRecord: InstructorRecord = {
  firstName: "",
  lastName: "",
  dateOfBirth: null,
  email: null,
};

export function InstructorDetailContent({ id }: { id: string }) {
  const [instructor, setInstructor] = useState<Instructor | null>(null);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [record, setRecord] = useState<InstructorRecord>(emptyRecord);
  const [documents, setDocuments] = useState<InstructorDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingRecord, setSavingRecord] = useState(false);
  const [docLabel, setDocLabel] = useState("");
  const [uploading, setUploading] = useState(false);
  const [busyDocId, setBusyDocId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    load();
  }, [id]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [inst, rec, docs] = await Promise.all([
        fetchInstructor(id),
        fetchInstructorRecord(id),
        fetchInstructorDocuments(id),
      ]);
      setInstructor(inst);
      setName(inst?.name ?? "");
      setBio(inst?.bio ?? "");
      setRecord(rec ?? emptyRecord);
      setDocuments(docs);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load this instructor."));
    } finally {
      setLoading(false);
    }
  }

  async function saveProfile() {
    if (savingProfile) return;
    setSavingProfile(true);
    setError(null);
    try {
      await updateInstructor(id, { name: name.trim(), bio });
      await load();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to save."));
    } finally {
      setSavingProfile(false);
    }
  }

  async function saveRecord() {
    if (savingRecord) return;
    setSavingRecord(true);
    setError(null);
    try {
      await saveInstructorRecord(id, record);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to save."));
    } finally {
      setSavingRecord(false);
    }
  }

  async function handleUpload() {
    const file = fileInputRef.current?.files?.[0];
    const label = docLabel.trim();
    if (!file || !label || uploading) return;
    setUploading(true);
    setError(null);
    try {
      await uploadInstructorDocument(id, label, file);
      setDocLabel("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      setDocuments(await fetchInstructorDocuments(id));
    } catch (err) {
      setError(getErrorMessage(err, "Failed to upload the document."));
    } finally {
      setUploading(false);
    }
  }

  async function handleView(doc: InstructorDocument) {
    try {
      const url = await getDocumentSignedUrl(doc.storagePath);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(getErrorMessage(err, "Failed to open the document."));
    }
  }

  async function handleDeleteDoc(doc: InstructorDocument) {
    if (!confirm(`Delete "${doc.label}"?`)) return;
    setBusyDocId(doc.id);
    setError(null);
    try {
      await deleteInstructorDocument(doc);
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
    } catch (err) {
      setError(getErrorMessage(err, "Failed to delete the document."));
    } finally {
      setBusyDocId(null);
    }
  }

  if (loading) {
    return (
      <main className="flex-1 bg-bg px-7 py-8">
        <p className="text-[13px] text-muted">Loading&hellip;</p>
      </main>
    );
  }

  return (
    <main className="flex-1 bg-bg">
      <div className="mx-auto max-w-2xl px-7 py-8">
        <Link
          href="/admin/instructors"
          className="text-[13px] font-semibold text-muted hover:text-ink"
        >
          &larr; Instructors
        </Link>

        {error && (
          <div className="mt-4 rounded-2xl border border-status-critical bg-status-critical-soft p-4 text-[13px] text-status-critical">
            {error}
          </div>
        )}

        {!instructor ? (
          <p className="mt-4 text-[13px] text-muted">Instructor not found.</p>
        ) : (
          <>
            <h1 className="mt-3 font-display text-[22px] font-bold text-ink">
              {instructor.name}
            </h1>

            <section className="mt-5 rounded-2xl border border-border bg-surface p-5">
              <h2 className="text-[13px] font-bold text-ink">
                Public profile
                <span className="ml-2 rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent-strong">
                  Shown to clients
                </span>
              </h2>
              <div className="mt-3 flex flex-col gap-3">
                <label className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-muted">
                    Display name
                  </span>
                  <input
                    className="field-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-muted">
                    Bio
                  </span>
                  <textarea
                    className="field-input min-h-[80px]"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="A couple of sentences shown on class detail pages…"
                  />
                </label>
                <button
                  onClick={saveProfile}
                  disabled={savingProfile}
                  className="self-start rounded-[9px] bg-accent-strong px-4 py-2.5 text-[13px] font-bold text-accent-ink hover:brightness-110 disabled:opacity-50"
                >
                  {savingProfile ? "Saving…" : "Save profile"}
                </button>
              </div>
            </section>

            <section className="mt-5 rounded-2xl border border-border bg-surface p-5">
              <h2 className="text-[13px] font-bold text-ink">
                Private record
                <span className="ml-2 rounded-full bg-status-warning-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-status-warning">
                  Admin/Owner only
                </span>
              </h2>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-muted">
                    First name
                  </span>
                  <input
                    className="field-input"
                    value={record.firstName}
                    onChange={(e) => setRecord({ ...record, firstName: e.target.value })}
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-muted">
                    Last name
                  </span>
                  <input
                    className="field-input"
                    value={record.lastName}
                    onChange={(e) => setRecord({ ...record, lastName: e.target.value })}
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-muted">
                    Date of birth
                  </span>
                  <input
                    type="date"
                    className="field-input"
                    value={record.dateOfBirth ?? ""}
                    onChange={(e) => setRecord({ ...record, dateOfBirth: e.target.value || null })}
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-muted">
                    Email
                  </span>
                  <input
                    type="email"
                    className="field-input"
                    value={record.email ?? ""}
                    onChange={(e) => setRecord({ ...record, email: e.target.value || null })}
                  />
                </label>
              </div>
              <button
                onClick={saveRecord}
                disabled={savingRecord}
                className="mt-3 self-start rounded-[9px] bg-accent-strong px-4 py-2.5 text-[13px] font-bold text-accent-ink hover:brightness-110 disabled:opacity-50"
              >
                {savingRecord ? "Saving…" : "Save record"}
              </button>
            </section>

            <section className="mt-5 rounded-2xl border border-border bg-surface p-5">
              <h2 className="text-[13px] font-bold text-ink">
                Documents
                <span className="ml-2 rounded-full bg-status-warning-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-status-warning">
                  Admin/Owner only
                </span>
              </h2>
              <p className="mt-1.5 text-[12px] text-muted">
                Freelancer contracts, Emirates ID / passport scans, visas — anything you need
                on file.
              </p>

              <div className="mt-3 flex flex-col gap-2">
                {documents.length === 0 ? (
                  <p className="text-[12.5px] text-muted">No documents uploaded yet.</p>
                ) : (
                  documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between rounded-xl border border-border bg-surface-2 px-3.5 py-2.5"
                    >
                      <div>
                        <div className="text-[13px] font-semibold text-ink">{doc.label}</div>
                        <div className="text-[11px] text-muted">
                          {new Date(doc.uploadedAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleView(doc)}
                          className="text-[12px] font-bold text-accent-strong hover:underline"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleDeleteDoc(doc)}
                          disabled={busyDocId === doc.id}
                          className="text-[12px] font-bold text-status-critical hover:underline disabled:opacity-50"
                        >
                          {busyDocId === doc.id ? "Deleting…" : "Delete"}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-4 flex flex-wrap items-end gap-2">
                <label className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-muted">
                    Label
                  </span>
                  <input
                    className="field-input max-w-[220px]"
                    placeholder="e.g. Freelancer contract"
                    value={docLabel}
                    onChange={(e) => setDocLabel(e.target.value)}
                  />
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/heic"
                  className="text-[12.5px]"
                />
                <button
                  onClick={handleUpload}
                  disabled={uploading || !docLabel.trim()}
                  className="rounded-[9px] border border-border-strong px-3.5 py-2 text-[12.5px] font-bold text-ink hover:bg-surface-2 disabled:opacity-50"
                >
                  {uploading ? "Uploading…" : "Upload"}
                </button>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
