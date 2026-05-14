"use client";

import { createInvoiceSchema, invoiceStatuses } from "@acme/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AppSelect } from "../inputs/app-select";

type InvoiceFormValues = z.infer<typeof createInvoiceSchema>;

export function InvoiceForm({
  interventionOptions,
  onSubmitInvoice,
  initialValues,
  submitLabel = "Generate invoice",
}: {
  interventionOptions: Array<{ id: string; title: string; clientId: string }>;
  onSubmitInvoice: (values: InvoiceFormValues) => Promise<void>;
  initialValues?: Partial<InvoiceFormValues>;
  submitLabel?: string;
}) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(createInvoiceSchema),
    defaultValues: {
      interventionId: "",
      clientId: "",
      status: "DRAFT",
      taxRate: 0.2,
      items: [{ description: "", quantity: 1, unitPrice: 0 }],
      ...initialValues,
    },
  });

  const selectedInterventionId = form.watch("interventionId");

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitError(null);
    setSubmitting(true);
    try {
      await onSubmitInvoice(values);
      form.reset({
        interventionId: "",
        clientId: "",
        status: "DRAFT",
        taxRate: 0.2,
        items: [{ description: "", quantity: 1, unitPrice: 0 }],
        ...initialValues,
      });
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to create invoice.");
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
      <label className="space-y-2 text-sm font-medium">
        <span>Intervention</span>
        <AppSelect
          {...form.register("interventionId")}
          onChange={(event) => {
            const nextId = event.target.value;
            form.setValue("interventionId", nextId);
            const match = interventionOptions.find((item) => item.id === nextId);
            form.setValue("clientId", match?.clientId ?? "");
          }}
        >
          <option value="">Select intervention</option>
          {interventionOptions.map((item) => (
            <option key={item.id} value={item.id}>
              {item.title}
            </option>
          ))}
        </AppSelect>
      </label>
      <label className="space-y-2 text-sm font-medium">
        <span>Status</span>
        <AppSelect {...form.register("status")}>
          {invoiceStatuses.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </AppSelect>
      </label>
      <label className="space-y-2 text-sm font-medium">
        <span>Line item description</span>
        <input {...form.register("items.0.description")} placeholder="Inspection labor" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" />
      </label>
      <label className="space-y-2 text-sm font-medium">
        <span>Quantity</span>
        <input
          type="number"
          step="0.01"
          {...form.register("items.0.quantity", { valueAsNumber: true })}
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
        />
      </label>
      <label className="space-y-2 text-sm font-medium">
        <span>Unit price</span>
        <input
          type="number"
          step="0.01"
          {...form.register("items.0.unitPrice", { valueAsNumber: true })}
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
        />
      </label>
      <label className="space-y-2 text-sm font-medium">
        <span>Tax rate</span>
        <input
          type="number"
          step="0.01"
          {...form.register("taxRate", { valueAsNumber: true })}
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
        />
      </label>
      {selectedInterventionId ? (
        <p className="text-sm text-slate-500 md:col-span-2">
          The matching client is auto-selected from the chosen intervention.
        </p>
      ) : null}
      {submitError ? <p className="text-sm text-red-600 md:col-span-2">{submitError}</p> : null}
      <button className="rounded-2xl bg-slate-950 px-5 py-3 font-medium text-white md:w-fit">
        {submitting ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}
