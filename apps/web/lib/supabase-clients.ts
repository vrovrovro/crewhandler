"use client";

import { z } from "zod";
import {
  clientContracts,
  clientDetailSchema,
  clientListResponseSchema,
  clientSchema,
  createClientSchema,
} from "@acme/shared";
import { supabaseBrowser } from "./supabase-browser";
import { getActiveWorkspaceContext } from "./supabase-workspace";
import { createAuthedApi } from "./api";
import { getAccessToken } from "./session-client";

type Client = z.infer<typeof clientSchema>;
type ClientListResponse = z.infer<typeof clientListResponseSchema>;
type ClientDetailResponse = z.infer<typeof clientDetailSchema>;
type CreateClientInput = z.infer<typeof createClientSchema>;

const ADMIN_ROLES = new Set(["OWNER", "ADMIN"]);

const mapClient = (item: Record<string, unknown>): Client =>
  clientSchema.parse({
    id: String(item.id),
    organizationId: String(item.organization_id),
    name: String(item.name),
    phone: item.phone == null ? null : String(item.phone),
    email: item.email == null ? null : String(item.email),
    address: item.address == null ? null : String(item.address),
    notes: item.notes == null ? null : String(item.notes),
    createdAt: String(item.created_at),
    updatedAt: String(item.updated_at),
  });

const ensureWorkspaceAdmin = async () => {
  const context = await getActiveWorkspaceContext();

  if (!ADMIN_ROLES.has(context.role)) {
    throw new Error("You do not have permission to manage clients in this workspace.");
  }

  return context;
};

const listClientsViaApi = async (query: {
  page: number;
  pageSize: number;
  sortBy: "name" | "createdAt";
  sortOrder: "asc" | "desc";
  search?: string;
}): Promise<ClientListResponse> => {
  const api = createAuthedApi(getAccessToken);
  return api.request(clientContracts.list, { query });
};

const getClientDetailViaApi = async (id: string): Promise<ClientDetailResponse> => {
  const api = createAuthedApi(getAccessToken);
  return api.request(clientContracts.detail, {
    pathParams: { id },
  });
};

export const listClientsDirect = async (query: {
  page: number;
  pageSize: number;
  sortBy: "name" | "createdAt";
  sortOrder: "asc" | "desc";
  search?: string;
}): Promise<ClientListResponse> => {
  const context = await ensureWorkspaceAdmin();
  const from = (query.page - 1) * query.pageSize;
  const to = from + query.pageSize - 1;

  let supabaseQuery = supabaseBrowser
    .from("clients")
    .select("*", { count: "exact" })
    .eq("organization_id", context.organizationId)
    .order(query.sortBy === "createdAt" ? "created_at" : "name", {
      ascending: query.sortOrder === "asc",
    })
    .range(from, to);

  if (query.search) {
    supabaseQuery = supabaseQuery.ilike("name", `%${query.search}%`);
  }

  const { data, count, error } = await supabaseQuery;
  if (error) {
    throw new Error(error.message);
  }

  if ((count ?? 0) === 0) {
    return listClientsViaApi(query);
  }

  return clientListResponseSchema.parse({
    items: (data ?? []).map((item) => mapClient(item as Record<string, unknown>)),
    total: count ?? 0,
    page: query.page,
    pageSize: query.pageSize,
  });
};

export const createClientDirect = async (values: CreateClientInput): Promise<Client> => {
  const context = await ensureWorkspaceAdmin();
  const payload = createClientSchema.parse(values);
  const { data, error } = await supabaseBrowser
    .from("clients")
    .insert({
      organization_id: context.organizationId,
      name: payload.name,
      phone: payload.phone ?? null,
      email: payload.email ?? null,
      address: payload.address ?? null,
      notes: payload.notes ?? null,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to create client");
  }

  return mapClient(data as Record<string, unknown>);
};

export const updateClientDirect = async (id: string, values: Partial<CreateClientInput>): Promise<Client> => {
  await ensureWorkspaceAdmin();
  const payload = createClientSchema.partial().parse(values);
  const { data, error } = await supabaseBrowser
    .from("clients")
    .update({
      ...(payload.name !== undefined ? { name: payload.name } : {}),
      ...(payload.phone !== undefined ? { phone: payload.phone } : {}),
      ...(payload.email !== undefined ? { email: payload.email } : {}),
      ...(payload.address !== undefined ? { address: payload.address } : {}),
      ...(payload.notes !== undefined ? { notes: payload.notes } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to update client");
  }

  return mapClient(data as Record<string, unknown>);
};

export const deleteClientDirect = async (id: string): Promise<Client> => {
  await ensureWorkspaceAdmin();
  const { data, error } = await supabaseBrowser.from("clients").delete().eq("id", id).select("*").single();

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to delete client");
  }

  return mapClient(data as Record<string, unknown>);
};

const mapIntervention = (item: Record<string, unknown>) => ({
  id: String(item.id),
  organizationId: String(item.organization_id),
  clientId: String(item.client_id),
  assignedTechnicianId: item.assigned_technician_id == null ? null : String(item.assigned_technician_id),
  title: String(item.title),
  description: item.description == null ? null : String(item.description),
  status: item.status,
  priority: item.priority,
  scheduledAt: item.scheduled_at == null ? null : String(item.scheduled_at),
  dueDate: item.due_date == null ? null : String(item.due_date),
  location: item.location == null ? null : String(item.location),
  notes: item.notes == null ? null : String(item.notes),
  createdAt: String(item.created_at),
  updatedAt: String(item.updated_at),
  completedAt: item.completed_at == null ? null : String(item.completed_at),
});

const mapInvoice = (invoice: Record<string, any>) => ({
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

export const getClientDetailDirect = async (id: string): Promise<ClientDetailResponse> => {
  const context = await ensureWorkspaceAdmin();

  const [{ data: client, error: clientError }, { data: interventions, error: interventionsError }, { data: invoices, error: invoicesError }] =
    await Promise.all([
      supabaseBrowser
        .from("clients")
        .select("*")
        .eq("id", id)
        .eq("organization_id", context.organizationId)
        .single(),
      supabaseBrowser
        .from("interventions")
        .select("*")
        .eq("organization_id", context.organizationId)
        .eq("client_id", id)
        .order("scheduled_at", { ascending: false, nullsFirst: false }),
      supabaseBrowser
        .from("invoices")
        .select("*, invoice_items(*)")
        .eq("organization_id", context.organizationId)
        .eq("client_id", id)
        .order("issued_at", { ascending: false }),
    ]);

  if (clientError || !client) {
    throw new Error(clientError?.message ?? "Client not found");
  }

  if (interventionsError) {
    throw new Error(interventionsError.message);
  }

  if (invoicesError) {
    throw new Error(invoicesError.message);
  }

  if ((interventions?.length ?? 0) === 0 && (invoices?.length ?? 0) === 0) {
    return getClientDetailViaApi(id);
  }

  return clientDetailSchema.parse({
    client: mapClient(client as Record<string, unknown>),
    interventions: (interventions ?? []).map((item) => mapIntervention(item as Record<string, unknown>)),
    invoices: (invoices ?? []).map((item) => mapInvoice(item as Record<string, any>)),
  });
};
