"use client";

import { createInvoiceSchema, interventionContracts, interventionListResponseSchema, invoiceContracts, invoiceListResponseSchema } from "@acme/shared";
import { z } from "zod";
import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { createAuthedApi } from "../../../lib/api";
import { getAccessToken } from "../../../lib/session-client";
import { InvoiceForm } from "../../../components/forms/invoice-form";
import { Modal } from "../../../components/overlay/modal";
import { DataTable } from "../../../components/tables/data-table";
import { StateCard } from "../../../components/feedback/state-card";
import { MobileKebabMenu } from "../../../components/menus/mobile-kebab-menu";
import { readViewCache, writeViewCache } from "../../../lib/view-cache";

type InvoiceListResponse = z.infer<typeof invoiceListResponseSchema>;
type InterventionListResponse = z.infer<typeof interventionListResponseSchema>;
type InvoiceItem = InvoiceListResponse["items"][number];
type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;

export default function InvoicesPage() {
  const [data, setData] = useState<InvoiceListResponse | null>(() => readViewCache<InvoiceListResponse>("invoices"));
  const [interventions, setInterventions] = useState<InterventionListResponse | null>(() => readViewCache<InterventionListResponse>("invoices:interventions"));
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editInvoice, setEditInvoice] = useState<InvoiceItem | null>(null);

  const load = async () => {
    try {
      const api = createAuthedApi(getAccessToken);
      const [invoicesResult, interventionsResult] = await Promise.all([
        api.request(invoiceContracts.list, {
          query: { page: 1, pageSize: 20 },
        }),
        api.request(interventionContracts.list, {
          query: { page: 1, pageSize: 100, sortBy: "scheduledAt", sortOrder: "asc" },
        }),
      ]);
      setData(invoicesResult);
      setInterventions(interventionsResult);
      writeViewCache("invoices", invoicesResult);
      writeViewCache("invoices:interventions", interventionsResult);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load invoices");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createInvoice = async (values: CreateInvoiceInput) => {
    const api = createAuthedApi(getAccessToken);
    await api.request(invoiceContracts.create, {
      body: values,
    });
    await load();
    setCreateOpen(false);
  };

  const updateInvoice = async (values: CreateInvoiceInput) => {
    if (!editInvoice) return;
    const api = createAuthedApi(getAccessToken);
    await api.request(invoiceContracts.update, {
      pathParams: { id: editInvoice.id },
      body: values,
    });
    await load();
    setEditInvoice(null);
  };

  const removeInvoice = async (id: string) => {
    const confirmed = window.confirm("Delete this invoice permanently?");
    if (!confirmed) return;

    const api = createAuthedApi(getAccessToken);
    await api.request(invoiceContracts.remove, {
      pathParams: { id },
    });
    await load();
  };

  return (
    <div className="space-y-4">
      {error ? (
        <StateCard title="Unable to load invoices" description={error} />
      ) : data ? (
        <DataTable
          title="Invoices"
          subtitle={`${data.total} invoices returned`}
          mobileLayout="table"
          mobileContent={
            <div className="divide-y divide-slate-200">
              {data.items.map((invoice) => (
                <article key={invoice.id} className="flex items-start justify-between gap-3 px-4 py-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-950">#{invoice.id.slice(0, 8)}</p>
                    <p className="mt-1 truncate text-sm text-slate-500">{invoice.status}</p>
                  </div>
                  <MobileKebabMenu
                    items={[
                      { label: "Edit", onClick: () => setEditInvoice(invoice) },
                      { label: "Delete", onClick: () => void removeInvoice(invoice.id), tone: "danger" },
                    ]}
                  />
                </article>
              ))}
            </div>
          }
          actions={
            <button
              onClick={() => setCreateOpen(true)}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white"
            >
              <Plus className="h-4 w-4" />
              New invoice
            </button>
          }
          columns={["Invoice", "Status", "Issued", "Amount", "Actions"]}
          rows={data.items.map((invoice) => [
            invoice.id,
            invoice.status,
            new Date(invoice.issuedAt).toLocaleDateString(),
            `$${invoice.total.toFixed(2)}`,
            <div key={invoice.id} className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setEditInvoice(invoice)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
              >
                <Pencil className="h-4 w-4" />
                Edit
              </button>
              <button
                type="button"
                onClick={() => removeInvoice(invoice.id)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </div>,
          ])}
        />
      ) : (
        <StateCard title="Loading invoices" description="Fetching invoice data from the API." />
      )}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Generate invoice"
        description="Create a new invoice from an intervention and one or more line items."
      >
        {interventions ? (
          <InvoiceForm
            interventionOptions={interventions.items.map((item) => ({
              id: item.id,
              title: item.title,
              clientId: item.clientId,
            }))}
            onSubmitInvoice={createInvoice}
          />
        ) : null}
      </Modal>
      <Modal
        open={Boolean(editInvoice)}
        onClose={() => setEditInvoice(null)}
        title="Edit invoice"
        description="Update line items, tax, and billing status."
      >
        {interventions && editInvoice ? (
          <InvoiceForm
            interventionOptions={interventions.items.map((item) => ({
              id: item.id,
              title: item.title,
              clientId: item.clientId,
            }))}
            initialValues={{
              interventionId: editInvoice.interventionId,
              clientId: editInvoice.clientId,
              status: editInvoice.status,
              taxRate: editInvoice.taxRate,
              items: editInvoice.items.map((item) => ({
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
              })),
            }}
            submitLabel="Save changes"
            onSubmitInvoice={updateInvoice}
          />
        ) : null}
      </Modal>
    </div>
  );
}
