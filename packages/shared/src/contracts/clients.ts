import {
  clientDetailSchema,
  clientListQuerySchema,
  clientListResponseSchema,
  clientSchema,
  createClientSchema,
  updateClientSchema,
} from "../schemas/clients";
import { defineContract } from "./http";

export const clientContracts = {
  list: defineContract({
    method: "GET",
    path: "/clients",
    query: clientListQuerySchema,
    response: clientListResponseSchema,
    auth: true,
  }),
  create: defineContract({
    method: "POST",
    path: "/clients",
    body: createClientSchema,
    response: clientSchema,
    auth: true,
  }),
  detail: defineContract({
    method: "GET",
    path: "/clients/:id",
    response: clientDetailSchema,
    auth: true,
  }),
  update: defineContract({
    method: "PATCH",
    path: "/clients/:id",
    body: updateClientSchema,
    response: clientSchema,
    auth: true,
  }),
  remove: defineContract({
    method: "DELETE",
    path: "/clients/:id",
    response: clientSchema,
    auth: true,
  }),
} as const;
