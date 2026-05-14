"use client";

import { useState } from "react";

export function AttachmentForm({
  interventionTitle,
  onSubmitAttachment,
}: {
  interventionTitle: string;
  onSubmitAttachment: (file: File) => Promise<void>;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) {
      setError("Please choose a file to upload.");
      return;
    }

    try {
      setError(null);
      setSubmitting(true);
      await onSubmitAttachment(file);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Upload failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <p className="text-sm font-medium text-slate-900">{interventionTitle}</p>
        <p className="mt-1 text-sm text-slate-500">
          Upload photo evidence or a service document into the `job-attachments` Supabase bucket.
        </p>
      </div>
      <label className="block rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
        <span className="block">Choose file</span>
        <input
          type="file"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          className="mt-3 block w-full text-sm"
        />
      </label>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white">
        {submitting ? "Uploading..." : "Upload attachment"}
      </button>
    </form>
  );
}
