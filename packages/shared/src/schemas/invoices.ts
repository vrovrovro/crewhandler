import { z } from "zod";
import { invoiceStatusSchema, paginationQuerySchema } from "./common";

export const invoiceItemSchema = z.object({
  id: z.string(),
  invoiceId: z.string(),
  description: z.string().trim().min(2).max(240),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  total: z.number().nonnegative(),
});

export const invoiceSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  interventionId: z.string(),
  clientId: z.string(),
  status: invoiceStatusSchema,
  subtotal: z.number().nonnegative(),
  taxRate: z.number().min(0).max(1),
  taxAmount: z.number().nonnegative(),
  total: z.number().nonnegative(),
  issuedAt: z.string().datetime({ offset: true }),
  paidAt: z.string().datetime({ offset: true }).nullable().optional(),
  items: z.array(invoiceItemSchema).min(1),
});

export const createInvoiceSchema = invoiceSchema.omit({
  id: true,
  organizationId: true,
  subtotal: true,
  taxAmount: true,
  total: true,
  issuedAt: true,
  paidAt: true,
}).extend({
  items: z.array(
    invoiceItemSchema.omit({
      id: true,
      invoiceId: true,
      total: true,
    }),
  ).min(1),
});

export const updateInvoiceStatusSchema = z.object({
  status: invoiceStatusSchema,
});

export const updateInvoiceSchema = createInvoiceSchema.partial().extend({
  items: z
    .array(
      invoiceItemSchema.omit({
        id: true,
        invoiceId: true,
        total: true,
      }),
    )
    .min(1)
    .optional(),
});

export const invoiceListQuerySchema = paginationQuerySchema.extend({
  status: invoiceStatusSchema.optional(),
  search: z.string().trim().max(120).optional(),
});

export const invoiceListResponseSchema = z.object({
  items: z.array(invoiceSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
});
