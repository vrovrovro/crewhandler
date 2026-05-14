import type { FastifyInstance } from "fastify";
import { createSupabaseAdmin } from "@acme/db";
import { clientContracts } from "@acme/shared";
import { requirePermission } from "../../lib/auth";

const admin = createSupabaseAdmin();

const serializeClient = (item: Record<string, unknown>) => ({
  id: String(item.id),
  organizationId: String(item.organization_id),
  name: String(item.name),
  phone: (item.phone as string | null) ?? null,
  email: (item.email as string | null) ?? null,
  address: (item.address as string | null) ?? null,
  notes: (item.notes as string | null) ?? null,
  createdAt: String(item.created_at),
  updatedAt: String(item.updated_at),
});
const serializeIntervention = (item: Record<string, unknown>) => ({
  id: String(item.id),
  organizationId: String(item.organization_id),
  clientId: String(item.client_id),
  assignedTechnicianId: (item.assigned_technician_id as string | null) ?? null,
  title: String(item.title),
  description: (item.description as string | null) ?? null,
  status: item.status,
  priority: item.priority,
  scheduledAt: (item.scheduled_at as string | null) ?? null,
  dueDate: (item.due_date as string | null) ?? null,
  location: (item.location as string | null) ?? null,
  notes: (item.notes as string | null) ?? null,
  createdAt: String(item.created_at),
  updatedAt: String(item.updated_at),
  completedAt: (item.completed_at as string | null) ?? null,
});
const serializeInvoice = (invoice: Record<string, any>) => ({
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

export const registerClientRoutes = async (app: FastifyInstance) => {
  app.get(
    clientContracts.list.path,
    { preHandler: [app.authenticate, requirePermission("clients:read")] },
    async (request) => {
      const query = clientContracts.list.query.parse(request.query);
      const from = (query.page - 1) * query.pageSize;
      const to = from + query.pageSize - 1;
      let supabaseQuery = admin
        .from("clients")
        .select("*", { count: "exact" })
        .eq("organization_id", request.user.organizationId)
        .order(query.sortBy === "createdAt" ? "created_at" : "name", {
          ascending: query.sortOrder === "asc",
        })
        .range(from, to);

      if (query.search) {
        supabaseQuery = supabaseQuery.ilike("name", `%${query.search}%`);
      }

      const { data, count, error } = await supabaseQuery;
      if (error) throw error;

      return clientContracts.list.response.parse({
        items: (data ?? []).map(serializeClient),
        total: count ?? 0,
        page: query.page,
        pageSize: query.pageSize,
      });
    },
  );

  app.post(
    clientContracts.create.path,
    { preHandler: [app.authenticate, requirePermission("clients:create")] },
    async (request) => {
      const payload = clientContracts.create.body.parse(request.body);
      const { data, error } = await admin
        .from("clients")
        .insert({
          organization_id: request.user.organizationId,
          name: payload.name,
          phone: payload.phone ?? null,
          email: payload.email ?? null,
          address: payload.address ?? null,
          notes: payload.notes ?? null,
        })
        .select("*")
        .single();

      if (error) throw error;
      return clientContracts.create.response.parse(serializeClient(data));
    },
  );

  app.get(
    clientContracts.detail.path,
    { preHandler: [app.authenticate, requirePermission("clients:read")] },
    async (request, reply) => {
      const id = (request.params as { id: string }).id;
      const { data: client, error } = await admin
        .from("clients")
        .select("*")
        .eq("id", id)
        .eq("organization_id", request.user.organizationId)
        .single();

      if (error || !client) {
        return reply.notFound("Client not found");
      }

      const [{ data: interventions }, { data: invoices }] = await Promise.all([
        admin
          .from("interventions")
          .select("*")
          .eq("organization_id", request.user.organizationId)
          .eq("client_id", id)
          .order("scheduled_at", { ascending: false, nullsFirst: false }),
        admin
          .from("invoices")
          .select("*, invoice_items(*)")
          .eq("organization_id", request.user.organizationId)
          .eq("client_id", id)
          .order("issued_at", { ascending: false }),
      ]);

      return clientContracts.detail.response.parse({
        client: serializeClient(client),
        interventions: (interventions ?? []).map(serializeIntervention),
        invoices: (invoices ?? []).map(serializeInvoice),
      });
    },
  );

  app.patch(
    "/clients/:id",
    { preHandler: [app.authenticate, requirePermission("clients:update")] },
    async (request, reply) => {
      const payload = clientContracts.update.body.parse(request.body);
      const id = (request.params as { id: string }).id;

      const { data, error } = await admin
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
        .eq("organization_id", request.user.organizationId)
        .select("*")
        .single();

      if (error) {
        return reply.notFound("Client not found");
      }

      return clientContracts.update.response.parse(serializeClient(data));
    },
  );

  app.delete(
    "/clients/:id",
    { preHandler: [app.authenticate, requirePermission("clients:delete")] },
    async (request, reply) => {
      const id = (request.params as { id: string }).id;

      const { data, error } = await admin
        .from("clients")
        .delete()
        .eq("id", id)
        .eq("organization_id", request.user.organizationId)
        .select("*")
        .single();

      if (error || !data) {
        return reply.notFound("Client not found");
      }

      return clientContracts.remove.response.parse(serializeClient(data));
    },
  );
};
