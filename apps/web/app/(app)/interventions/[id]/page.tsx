"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { interventionContracts, interventionDetailSchema, uploadContracts } from "@acme/shared";
import { ArrowLeft, Eye, ImageIcon, Trash2, Upload } from "lucide-react";
import { z } from "zod";
import { createAuthedApi } from "../../../../lib/api";
import { getAccessToken } from "../../../../lib/session-client";
import { supabaseBrowser } from "../../../../lib/supabase-browser";
import { AttachmentForm } from "../../../../components/forms/attachment-form";
import { Modal } from "../../../../components/overlay/modal";
import { StateCard } from "../../../../components/feedback/state-card";

type InterventionDetail = z.infer<typeof interventionDetailSchema>;

export default function InterventionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [data, setData] = useState<InterventionDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  const load = async (interventionId: string) => {
    try {
      const api = createAuthedApi(getAccessToken);
      const result = await api.request(interventionContracts.detail, {
        pathParams: { id: interventionId },
      });
      setData(result);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load intervention");
    }
  };

  useEffect(() => {
    if (resolvedParams.id) {
      load(resolvedParams.id);
    }
  }, [resolvedParams.id]);

  const uploadAttachment = async (file: File) => {
    if (!data) return;
    const api = createAuthedApi(getAccessToken);
    const signed = await api.request(uploadContracts.createSignedUrl, {
      body: {
        bucket: "job-attachments",
        interventionId: data.intervention.id,
        fileName: file.name,
        contentType: file.type || "application/octet-stream",
      },
    });

    const { error: uploadError } = await supabaseBrowser.storage
      .from("job-attachments")
      .uploadToSignedUrl(signed.path, signed.token, file);

    if (uploadError) throw uploadError;

    await api.request(interventionContracts.addAttachment, {
      pathParams: { id: data.intervention.id },
      body: {
        interventionId: data.intervention.id,
        kind: file.type.startsWith("image/") ? "PHOTO" : "DOCUMENT",
        fileName: file.name,
        fileUrl: signed.path,
      },
    });

    await load(data.intervention.id);
    setUploadOpen(false);
  };

  const deleteAttachment = async (attachmentId: string) => {
    if (!data) return;
    const api = createAuthedApi(getAccessToken);
    await api.request(interventionContracts.deleteAttachment, {
      pathParams: { id: data.intervention.id, attachmentId },
    });
    await load(data.intervention.id);
  };

  if (error) {
    return <StateCard title="Unable to load intervention" description={error} />;
  }

  if (!data) {
    return <StateCard title="Loading intervention" description="Fetching the job record, notes, and attachments." />;
  }

  return (
    <div className="space-y-4">
      <section className="rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-[0_12px_40px_rgba(15,23,42,0.05)] sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => {
                if (window.history.length > 1) {
                  router.back();
                  return;
                }
                router.push("/interventions");
              }}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to interventions
            </button>
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Intervention details</p>
            <h1 className="mt-3 text-3xl font-semibold text-slate-950 sm:text-4xl">{data.intervention.title}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500 sm:text-base">
              {data.intervention.description ?? "No description provided."}
            </p>
          </div>
          <button
            onClick={() => setUploadOpen(true)}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white"
          >
            <Upload className="h-4 w-4" />
            Upload image
          </button>
        </div>
      </section>
      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[28px] border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-950">Job information</h2>
          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-[0.2em] text-slate-400">Status</dt>
              <dd className="mt-1 text-sm text-slate-800">{data.intervention.status}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.2em] text-slate-400">Priority</dt>
              <dd className="mt-1 text-sm text-slate-800">{data.intervention.priority}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.2em] text-slate-400">Scheduled</dt>
              <dd className="mt-1 text-sm text-slate-800">{data.intervention.scheduledAt ? new Date(data.intervention.scheduledAt).toLocaleString() : "Not scheduled"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.2em] text-slate-400">Due date</dt>
              <dd className="mt-1 text-sm text-slate-800">{data.intervention.dueDate ? new Date(data.intervention.dueDate).toLocaleString() : "No due date"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs uppercase tracking-[0.2em] text-slate-400">Location</dt>
              <dd className="mt-1 text-sm text-slate-800">{data.intervention.location ?? "No location provided"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs uppercase tracking-[0.2em] text-slate-400">Internal notes</dt>
              <dd className="mt-1 text-sm text-slate-800">{data.intervention.notes ?? "No notes yet"}</dd>
            </div>
          </dl>
        </div>
        <div className="space-y-4">
          <section className="rounded-[28px] border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-slate-950">Attachments</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {data.attachments.length ? (
                data.attachments.map((attachment) => (
                  <Link
                    key={attachment.id}
                    href={attachment.fileUrl}
                    target="_blank"
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
                  >
                    {attachment.kind === "PHOTO" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={attachment.fileUrl} alt={attachment.fileName} className="h-40 w-full object-cover" />
                    ) : (
                      <div className="flex h-40 items-center justify-center bg-slate-100">
                        <ImageIcon className="h-8 w-8 text-slate-400" />
                      </div>
                    )}
                    <div className="p-3">
                      <p className="truncate text-sm font-medium text-slate-900">{attachment.fileName}</p>
                      <div className="mt-3 flex items-center gap-2">
                        <span className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700">
                          <Eye className="h-3.5 w-3.5" />
                          Open
                        </span>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.preventDefault();
                            deleteAttachment(attachment.id);
                          }}
                          className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <p className="text-sm text-slate-500">No attachments uploaded yet.</p>
              )}
            </div>
          </section>
          <section className="rounded-[28px] border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-slate-950">Activity notes</h2>
            <div className="mt-4 space-y-3">
              {data.notes.length ? (
                data.notes.map((note) => (
                  <article key={note.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm text-slate-800">{note.content}</p>
                    <p className="mt-2 text-xs text-slate-400">{new Date(note.createdAt).toLocaleString()}</p>
                  </article>
                ))
              ) : (
                <p className="text-sm text-slate-500">No notes recorded yet.</p>
              )}
            </div>
          </section>
        </div>
      </section>
      <Modal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        title="Upload attachment"
        description="Upload images or documents for this intervention."
      >
        <AttachmentForm interventionTitle={data.intervention.title} onSubmitAttachment={uploadAttachment} />
      </Modal>
    </div>
  );
}
