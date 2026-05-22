"use client";

import { z } from "zod";
import {
  calculateInvoiceTotals,
  createInvoiceSchema,
  invoiceContracts,
  invoiceListResponseSchema,
  invoiceSchema,
} from "@acme/shared";
import { createAuthedApi } from "./api";
import { getAccessToken } from "./session-client";
import { supabaseBrowser } from "./supabase-browser";
import { getActiveWorkspaceContext } from "./supabase-workspace";

type Invoice = z.infer<typeof invoiceSchema>;
type InvoiceListResponse = z.infer<typeof invoiceListResponseSchema>;
type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;

const ADMIN_ROLES = new Set(["OWNER", "ADMIN"]);

const mapInvoice = (invoice: Record<string, any>): Invoice =>
  invoiceSchema.parse({
    id: String(invoice.id),
    organizationId: String(invoice.organization_id),
    interventionId: String(invoice.intervention_id),
    clientId: String(invoice.client_id),
    status: invoice.status,
    subtotal: Number(invoice.subtotal),
    taxRate: Number(invoice.tax_rate),
    taxAmount: Number(invoice.tax_amount),
    total: Number(invoice.total),
    issuedAt: String(invoice.issued_at),
    paidAt: invoice.paid_at ? String(invoice.paid_at) : null,
    items: (invoice.invoice_items ?? []).map((item: Record<string, any>) => ({
      id: String(item.id),
      invoiceId: String(item.invoice_id),
      description: String(item.description),
      quantity: Number(item.quantity),
      unitPrice: Number(item.unit_price),
      total: Number(item.total),
    })),
  });

const ensureWorkspaceAdmin = async () => {
  const context = await getActiveWorkspaceContext();

  if (!ADMIN_ROLES.has(context.role)) {
    throw new Error("You do not have permission to manage invoices in this workspace.");
  }

  return context;
};

const listInvoicesViaApi = async (query: {
  page: number;
  pageSize: number;
  status?: Invoice["status"];
  search?: string;
}): Promise<InvoiceListResponse> => {
  const api = createAuthedApi(getAccessToken);
  return api.request(invoiceContracts.list, { query });
};

export const listInvoicesDirect = async (query: {
  page: number;
  pageSize: number;
  status?: Invoice["status"];
  search?: string;
}): Promise<InvoiceListResponse> => {
  const context = await ensureWorkspaceAdmin();
  const from = (query.page - 1) * query.pageSize;
  const to = from + query.pageSize - 1;

  let supabaseQuery = supabaseBrowser
    .from("invoices")
    .select("*, invoice_items(*)", { count: "exact" })
    .eq("organization_id", context.organizationId)
    .order("issued_at", { ascending: false })
    .range(from, to);

  if (query.status) {
    supabaseQuery = supabaseQuery.eq("status", query.status);
  }

  const { data, count, error } = await supabaseQuery;
  if (error) {
    throw new Error(error.message);
  }

  if ((count ?? 0) === 0) {
    return listInvoicesViaApi(query);
  }

  return invoiceListResponseSchema.parse({
    items: (data ?? []).map((item) => mapInvoice(item as Record<string, any>)),
    total: count ?? 0,
    page: query.page,
    pageSize: query.pageSize,
  });
};

export const createInvoiceDirect = async (values: CreateInvoiceInput): Promise<Invoice> => {
  const context = await ensureWorkspaceAdmin();
  const payload = createInvoiceSchema.parse(values);
  const totals = calculateInvoiceTotals(payload.items, payload.taxRate);

  const { data: invoice, error } = await supabaseBrowser
    .from("invoices")
    .insert({
      organization_id: context.organizationId,
      intervention_id: payload.interventionId,
      client_id: payload.clientId,
      status: payload.status,
      subtotal: totals.subtotal,
      tax_rate: payload.taxRate,
      tax_amount: totals.taxAmount,
      total: totals.total,
    })
    .select("*")
    .single();

  if (error || !invoice) {
    throw new Error(error?.message ?? "Unable to create invoice");
  }

  const { error: itemsError } = await supabaseBrowser.from("invoice_items").insert(
    payload.items.map((item) => ({
      invoice_id: invoice.id,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      total: item.quantity * item.unitPrice,
    })),
  );

  if (itemsError) {
    throw new Error(itemsError.message);
  }

  const { data: hydrated, error: hydratedError } = await supabaseBrowser
    .from("invoices")
    .select("*, invoice_items(*)")
    .eq("id", invoice.id)
    .single();

  if (hydratedError || !hydrated) {
    throw new Error(hydratedError?.message ?? "Unable to load created invoice");
  }

  return mapInvoice(hydrated as Record<string, any>);
};

export const updateInvoiceDirect = async (id: string, values: Partial<CreateInvoiceInput>): Promise<Invoice> => {
  await ensureWorkspaceAdmin();
  const payload = createInvoiceSchema.partial().extend({
    items: createInvoiceSchema.shape.items.optional(),
  }).parse(values);

  const { data: existing, error: existingError } = await supabaseBrowser
    .from("invoices")
    .select("*")
    .eq("id", id)
    .single();

  if (existingError || !existing) {
    throw new Error(existingError?.message ?? "Invoice not found");
  }

  const nextItems =
    payload.items?.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    })) ?? null;

  const totals = nextItems
    ? calculateInvoiceTotals(nextItems, payload.taxRate ?? Number(existing.tax_rate))
    : null;

  const { data: updatedInvoice, error: updateError } = await supabaseBrowser
    .from("invoices")
    .update({
      ...(payload.interventionId !== undefined ? { intervention_id: payload.interventionId } : {}),
      ...(payload.clientId !== undefined ? { client_id: payload.clientId } : {}),
      ...(payload.status !== undefined ? { status: payload.status } : {}),
      ...(payload.taxRate !== undefined ? { tax_rate: payload.taxRate } : {}),
      ...(totals
        ? {
            subtotal: totals.subtotal,
            tax_amount: totals.taxAmount,
            total: totals.total,
          }
        : {}),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (updateError || !updatedInvoice) {
    throw new Error(updateError?.message ?? "Unable to update invoice");
  }

  if (nextItems) {
    const { error: deleteItemsError } = await supabaseBrowser.from("invoice_items").delete().eq("invoice_id", id);
    if (deleteItemsError) {
      throw new Error(deleteItemsError.message);
    }

    const { error: itemsError } = await supabaseBrowser.from("invoice_items").insert(
      nextItems.map((item) => ({
        invoice_id: id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total: item.quantity * item.unitPrice,
      })),
    );

    if (itemsError) {
      throw new Error(itemsError.message);
    }
  }

  const { data: hydrated, error: hydratedError } = await supabaseBrowser
    .from("invoices")
    .select("*, invoice_items(*)")
    .eq("id", id)
    .single();

  if (hydratedError || !hydrated) {
    throw new Error(hydratedError?.message ?? "Unable to load updated invoice");
  }

  return mapInvoice(hydrated as Record<string, any>);
};

export const deleteInvoiceDirect = async (id: string): Promise<Invoice> => {
  await ensureWorkspaceAdmin();
  const { data, error } = await supabaseBrowser
    .from("invoices")
    .delete()
    .eq("id", id)
    .select("*, invoice_items(*)")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to delete invoice");
  }

  return mapInvoice(data as Record<string, any>);
};
