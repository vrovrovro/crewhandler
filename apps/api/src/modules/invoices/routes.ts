import type { FastifyInstance } from "fastify";
import { createSupabaseAdmin } from "@acme/db";
import { calculateInvoiceTotals, invoiceContracts } from "@acme/shared";
import { requirePermission } from "../../lib/auth.js";

const admin = createSupabaseAdmin();

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

export const registerInvoiceRoutes = async (app: FastifyInstance) => {
  app.get(
    invoiceContracts.list.path,
    { preHandler: [app.authenticate, requirePermission("invoices:read")] },
    async (request) => {
      const query = invoiceContracts.list.query.parse(request.query);
      const from = (query.page - 1) * query.pageSize;
      const to = from + query.pageSize - 1;
      let supabaseQuery = admin
        .from("invoices")
        .select("*, invoice_items(*)", { count: "exact" })
        .eq("organization_id", request.user.organizationId)
        .order("issued_at", { ascending: false })
        .range(from, to);

      if (query.status) supabaseQuery = supabaseQuery.eq("status", query.status);

      const { data, count, error } = await supabaseQuery;
      if (error) throw error;

      return invoiceContracts.list.response.parse({
        items: (data ?? []).map(serializeInvoice),
        total: count ?? 0,
        page: query.page,
        pageSize: query.pageSize,
      });
    },
  );

  app.post(
    invoiceContracts.create.path,
    { preHandler: [app.authenticate, requirePermission("invoices:create")] },
    async (request) => {
      const payload = invoiceContracts.create.body.parse(request.body);
      const totals = calculateInvoiceTotals(payload.items, payload.taxRate);

      const { data: invoice, error } = await admin
        .from("invoices")
        .insert({
          organization_id: request.user.organizationId,
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

      if (error) throw error;

      const { error: itemsError } = await admin.from("invoice_items").insert(
        payload.items.map((item: { description: string; quantity: number; unitPrice: number }) => ({
          invoice_id: invoice.id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          total: item.quantity * item.unitPrice,
        })),
      );

      if (itemsError) throw itemsError;

      const { data: hydrated } = await admin
        .from("invoices")
        .select("*, invoice_items(*)")
        .eq("id", invoice.id)
        .single();

      return invoiceContracts.create.response.parse(serializeInvoice(hydrated!));
    },
  );

  app.patch(
    "/invoices/:id",
    { preHandler: [app.authenticate, requirePermission("invoices:update")] },
    async (request, reply) => {
      const id = (request.params as { id: string }).id;
      const payload = invoiceContracts.update.body.parse(request.body);

      const { data: existing, error: existingError } = await admin
        .from("invoices")
        .select("*")
        .eq("id", id)
        .eq("organization_id", request.user.organizationId)
        .single();

      if (existingError || !existing) {
        return reply.notFound("Invoice not found");
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

      const { data: updatedInvoice, error: updateError } = await admin
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
        .eq("organization_id", request.user.organizationId)
        .select("*")
        .single();

      if (updateError || !updatedInvoice) {
        return reply.notFound("Invoice not found");
      }

      if (nextItems) {
        const { error: deleteItemsError } = await admin.from("invoice_items").delete().eq("invoice_id", id);
        if (deleteItemsError) throw deleteItemsError;

        const { error: itemsError } = await admin.from("invoice_items").insert(
          nextItems.map((item: { description: string; quantity: number; unitPrice: number }) => ({
            invoice_id: id,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            total: item.quantity * item.unitPrice,
          })),
        );
        if (itemsError) throw itemsError;
      }

      const { data: hydrated } = await admin
        .from("invoices")
        .select("*, invoice_items(*)")
        .eq("id", id)
        .single();

      return invoiceContracts.update.response.parse(serializeInvoice(hydrated!));
    },
  );

  app.patch(
    "/invoices/:id/status",
    { preHandler: [app.authenticate, requirePermission("invoices:update")] },
    async (request, reply) => {
      const id = (request.params as { id: string }).id;
      const payload = invoiceContracts.updateStatus.body.parse(request.body);

      const { data, error } = await admin
        .from("invoices")
        .update({
          status: payload.status,
          paid_at: payload.status === "PAID" ? new Date().toISOString() : null,
        })
        .eq("id", id)
        .eq("organization_id", request.user.organizationId)
        .select("*, invoice_items(*)")
        .single();

      if (error) return reply.notFound("Invoice not found");
      return invoiceContracts.updateStatus.response.parse(serializeInvoice(data));
    },
  );

  app.delete(
    "/invoices/:id",
    { preHandler: [app.authenticate, requirePermission("invoices:update")] },
    async (request, reply) => {
      const id = (request.params as { id: string }).id;

      const { data, error } = await admin
        .from("invoices")
        .delete()
        .eq("id", id)
        .eq("organization_id", request.user.organizationId)
        .select("*, invoice_items(*)")
        .single();

      if (error || !data) {
        return reply.notFound("Invoice not found");
      }

      return invoiceContracts.remove.response.parse(serializeInvoice(data));
    },
  );
};
