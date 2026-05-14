import { z } from "zod";
import { paginationQuerySchema } from "./common";
import { interventionSchema } from "./interventions";
import { invoiceSchema } from "./invoices";

const nullableTrimmedString = (schema: z.ZodTypeAny) =>
  z.preprocess((value) => (typeof value === "string" && value.trim() === "" ? null : value), schema.nullable().optional());

export const clientSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  name: z.string().trim().min(2).max(120),
  phone: nullableTrimmedString(z.string().trim().min(6).max(30)),
  email: nullableTrimmedString(z.string().email()),
  address: nullableTrimmedString(z.string().trim().min(3).max(240)),
  notes: nullableTrimmedString(z.string().trim().max(4000)),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});

export const createClientSchema = clientSchema.omit({
  id: true,
  organizationId: true,
  createdAt: true,
  updatedAt: true,
});

export const updateClientSchema = createClientSchema.partial();

export const clientListQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().max(120).optional(),
  sortBy: z.enum(["name", "createdAt"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export const clientListResponseSchema = z.object({
  items: z.array(clientSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
});

export const clientDetailSchema = z.object({
  client: clientSchema,
  interventions: z.array(interventionSchema),
  invoices: z.array(invoiceSchema),
});

export const deleteClientSchema = clientSchema;
