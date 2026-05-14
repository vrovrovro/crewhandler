import {
  createInvoiceSchema,
  invoiceListQuerySchema,
  invoiceListResponseSchema,
  invoiceSchema,
  updateInvoiceSchema,
  updateInvoiceStatusSchema,
} from "../schemas/invoices";
import { defineContract } from "./http";

export const invoiceContracts = {
  list: defineContract({
    method: "GET",
    path: "/invoices",
    query: invoiceListQuerySchema,
    response: invoiceListResponseSchema,
    auth: true,
  }),
  create: defineContract({
    method: "POST",
    path: "/invoices",
    body: createInvoiceSchema,
    response: invoiceSchema,
    auth: true,
  }),
  update: defineContract({
    method: "PATCH",
    path: "/invoices/:id",
    body: updateInvoiceSchema,
    response: invoiceSchema,
    auth: true,
  }),
  updateStatus: defineContract({
    method: "PATCH",
    path: "/invoices/:id/status",
    body: updateInvoiceStatusSchema,
    response: invoiceSchema,
    auth: true,
  }),
  remove: defineContract({
    method: "DELETE",
    path: "/invoices/:id",
    response: invoiceSchema,
    auth: true,
  }),
} as const;
