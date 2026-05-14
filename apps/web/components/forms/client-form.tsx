"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { createClientSchema } from "@acme/shared";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";

type ClientFormValues = z.infer<typeof createClientSchema>;

export function ClientForm({
  onSubmitClient,
  initialValues,
  submitLabel = "Save client",
}: {
  onSubmitClient: (values: ClientFormValues) => Promise<void>;
  initialValues?: Partial<ClientFormValues>;
  submitLabel?: string;
}) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const form = useForm<ClientFormValues>({
    resolver: zodResolver(createClientSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      address: "",
      notes: "",
      ...initialValues,
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitError(null);
    setSubmitting(true);

    try {
      await onSubmitClient(values);
      form.reset(initialValues ?? {
        name: "",
        phone: "",
        email: "",
        address: "",
        notes: "",
      });
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to save client.");
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
      {["name", "phone", "email", "address"].map((field) => (
        <label key={field} className="space-y-2 text-sm font-medium">
          <span className="capitalize">{field}</span>
          <input
            {...form.register(field as keyof ClientFormValues)}
            placeholder={
              field === "name"
                ? "Northwind Bakery"
                : field === "phone"
                  ? "+33 6 00 00 00 00"
                  : field === "email"
                    ? "ops@northwind.example"
                    : "14 Rue de Lyon, Paris"
            }
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
          />
        </label>
      ))}
      <label className="space-y-2 text-sm font-medium md:col-span-2">
        <span>Notes</span>
        <textarea
          {...form.register("notes")}
          rows={4}
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
        />
      </label>
      {submitError ? (
        <p className="text-sm text-red-600 md:col-span-2">{submitError}</p>
      ) : null}
      <button className="rounded-2xl bg-slate-950 px-5 py-3 font-medium text-white md:w-fit">
        {submitting ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}
