import { z } from "zod";
import {
  attachmentKindSchema,
  interventionPrioritySchema,
  interventionStatusSchema,
  paginationQuerySchema,
} from "./common";

export const interventionSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  clientId: z.string(),
  assignedTechnicianId: z.string().nullable().optional(),
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().max(4000).nullable().optional(),
  status: interventionStatusSchema,
  priority: interventionPrioritySchema,
  scheduledAt: z.string().datetime({ offset: true }).nullable().optional(),
  dueDate: z.string().datetime({ offset: true }).nullable().optional(),
  location: z.string().trim().max(240).nullable().optional(),
  notes: z.string().trim().max(4000).nullable().optional(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
  completedAt: z.string().datetime({ offset: true }).nullable().optional(),
});

export const createInterventionSchema = interventionSchema.omit({
  id: true,
  organizationId: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
});

export const updateInterventionSchema = createInterventionSchema.partial();

export const interventionListQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().max(120).optional(),
  status: interventionStatusSchema.optional(),
  priority: interventionPrioritySchema.optional(),
  assignedTechnicianId: z.string().optional(),
  scheduledFrom: z.string().datetime({ offset: true }).optional(),
  scheduledTo: z.string().datetime({ offset: true }).optional(),
  sortBy: z.enum(["scheduledAt", "dueDate", "createdAt", "priority"]).default("scheduledAt"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

export const interventionStatusUpdateSchema = z.object({
  status: interventionStatusSchema,
  note: z.string().trim().max(1000).optional(),
});

export const jobNoteSchema = z.object({
  id: z.string(),
  interventionId: z.string(),
  authorId: z.string(),
  content: z.string().trim().min(1).max(2000),
  createdAt: z.string().datetime({ offset: true }),
});

export const createJobNoteSchema = jobNoteSchema.omit({
  id: true,
  authorId: true,
  createdAt: true,
});

export const jobAttachmentSchema = z.object({
  id: z.string(),
  interventionId: z.string(),
  uploaderId: z.string(),
  kind: attachmentKindSchema,
  fileName: z.string().trim().min(1).max(255),
  fileUrl: z.string().min(1),
  createdAt: z.string().datetime({ offset: true }),
});

export const createJobAttachmentSchema = jobAttachmentSchema.omit({
  id: true,
  uploaderId: true,
  createdAt: true,
});

export const interventionListResponseSchema = z.object({
  items: z.array(interventionSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
});

export const interventionDetailSchema = z.object({
  intervention: interventionSchema,
  notes: z.array(jobNoteSchema),
  attachments: z.array(jobAttachmentSchema),
});
