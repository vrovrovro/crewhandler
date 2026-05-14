"use client";

import { createInterventionSchema, interventionPriorities, interventionStatuses } from "@acme/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AppSelect } from "../inputs/app-select";

type InterventionFormValues = z.infer<typeof createInterventionSchema>;

export function InterventionForm({
  clientOptions,
  memberOptions = [],
  onSubmitIntervention,
  initialValues,
  submitLabel = "Create intervention",
}: {
  clientOptions: Array<{ id: string; name: string; address?: string | null }>;
  memberOptions?: Array<{ id: string; name: string; role?: string }>;
  onSubmitIntervention: (values: InterventionFormValues) => Promise<void>;
  initialValues?: Partial<InterventionFormValues>;
  submitLabel?: string;
}) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const form = useForm<InterventionFormValues>({
    resolver: zodResolver(createInterventionSchema),
    defaultValues: {
      clientId: "",
      assignedTechnicianId: null,
      title: "",
      description: "",
      status: "SCHEDULED",
      priority: "MEDIUM",
      scheduledAt: null,
      dueDate: null,
      location: "",
      notes: "",
      ...initialValues,
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitError(null);
    setSubmitting(true);

    try {
      await onSubmitIntervention(values);
      form.reset({
        clientId: "",
        assignedTechnicianId: null,
        title: "",
        description: "",
        status: "SCHEDULED",
        priority: "MEDIUM",
        scheduledAt: null,
        dueDate: null,
        location: "",
        notes: "",
        ...initialValues,
      });
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to create intervention.");
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
      <label className="space-y-2 text-sm font-medium">
        <span>Client</span>
        <AppSelect {...form.register("clientId")}>
          <option value="">Select client</option>
          {clientOptions.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </AppSelect>
      </label>
      <label className="space-y-2 text-sm font-medium">
        <span>Title</span>
        <input {...form.register("title")} placeholder="Quarterly HVAC inspection" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" />
      </label>
      <label className="space-y-2 text-sm font-medium">
        <span>Assigned team member</span>
        <AppSelect
          value={form.watch("assignedTechnicianId") ?? ""}
          onChange={(event) => form.setValue("assignedTechnicianId", event.target.value || null, { shouldDirty: true })}
        >
          <option value="">Unassigned</option>
          {memberOptions.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
              {member.role ? ` (${member.role})` : ""}
            </option>
          ))}
        </AppSelect>
      </label>
      <label className="space-y-2 text-sm font-medium md:col-span-2">
        <span>Description</span>
        <textarea {...form.register("description")} placeholder="Describe scope, customer request, and operational context." rows={4} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" />
      </label>
      <label className="space-y-2 text-sm font-medium">
        <span>Status</span>
        <AppSelect {...form.register("status")}>
          {interventionStatuses.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </AppSelect>
      </label>
      <label className="space-y-2 text-sm font-medium">
        <span>Priority</span>
        <AppSelect {...form.register("priority")}>
          {interventionPriorities.map((priority) => (
            <option key={priority} value={priority}>
              {priority}
            </option>
          ))}
        </AppSelect>
      </label>
      <label className="space-y-2 text-sm font-medium">
        <span>Scheduled at</span>
        <input
          type="datetime-local"
          defaultValue={initialValues?.scheduledAt ? new Date(initialValues.scheduledAt).toISOString().slice(0, 16) : ""}
          onChange={(event) =>
            form.setValue("scheduledAt", event.target.value ? new Date(event.target.value).toISOString() : null)
          }
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
        />
      </label>
      <label className="space-y-2 text-sm font-medium">
        <span>Due date</span>
        <input
          type="datetime-local"
          defaultValue={initialValues?.dueDate ? new Date(initialValues.dueDate).toISOString().slice(0, 16) : ""}
          onChange={(event) =>
            form.setValue("dueDate", event.target.value ? new Date(event.target.value).toISOString() : null)
          }
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
        />
      </label>
      <label className="space-y-2 text-sm font-medium md:col-span-2">
        <span>Location</span>
        <input {...form.register("location")} placeholder="14 Rue de Lyon, Paris" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" />
      </label>
      <label className="space-y-2 text-sm font-medium md:col-span-2">
        <span>Notes</span>
        <textarea {...form.register("notes")} placeholder="Internal dispatch notes, access info, or required tools." rows={3} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" />
      </label>
      {submitError ? <p className="text-sm text-red-600 md:col-span-2">{submitError}</p> : null}
      <button className="rounded-2xl bg-slate-950 px-5 py-3 font-medium text-white md:w-fit">
        {submitting ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}
