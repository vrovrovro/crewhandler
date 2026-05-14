import {
  createInterventionSchema,
  interventionDetailSchema,
  createJobAttachmentSchema,
  createJobNoteSchema,
  interventionListQuerySchema,
  interventionListResponseSchema,
  interventionSchema,
  interventionStatusUpdateSchema,
  jobAttachmentSchema,
  jobNoteSchema,
  updateInterventionSchema,
} from "../schemas/interventions";
import { defineContract } from "./http";

export const interventionContracts = {
  list: defineContract({
    method: "GET",
    path: "/interventions",
    query: interventionListQuerySchema,
    response: interventionListResponseSchema,
    auth: true,
  }),
  detail: defineContract({
    method: "GET",
    path: "/interventions/:id",
    response: interventionDetailSchema,
    auth: true,
  }),
  create: defineContract({
    method: "POST",
    path: "/interventions",
    body: createInterventionSchema,
    response: interventionSchema,
    auth: true,
  }),
  update: defineContract({
    method: "PATCH",
    path: "/interventions/:id",
    body: updateInterventionSchema,
    response: interventionSchema,
    auth: true,
  }),
  updateStatus: defineContract({
    method: "PATCH",
    path: "/interventions/:id/status",
    body: interventionStatusUpdateSchema,
    response: interventionSchema,
    auth: true,
  }),
  addNote: defineContract({
    method: "POST",
    path: "/interventions/:id/notes",
    body: createJobNoteSchema,
    response: jobNoteSchema,
    auth: true,
  }),
  addAttachment: defineContract({
    method: "POST",
    path: "/interventions/:id/attachments",
    body: createJobAttachmentSchema,
    response: jobAttachmentSchema,
    auth: true,
  }),
  deleteAttachment: defineContract({
    method: "DELETE",
    path: "/interventions/:id/attachments/:attachmentId",
    response: jobAttachmentSchema,
    auth: true,
  }),
  remove: defineContract({
    method: "DELETE",
    path: "/interventions/:id",
    response: interventionSchema,
    auth: true,
  }),
} as const;
