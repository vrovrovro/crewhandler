import { z } from "zod";
import {
  attachmentKinds,
  interventionPriorities,
  interventionStatuses,
  invitationStatuses,
  invoiceStatuses,
  userRoles,
} from "../domain/enums";

export const roleSchema = z.enum(userRoles);
export const interventionStatusSchema = z.enum(interventionStatuses);
export const interventionPrioritySchema = z.enum(interventionPriorities);
export const invoiceStatusSchema = z.enum(invoiceStatuses);
export const attachmentKindSchema = z.enum(attachmentKinds);
export const invitationStatusSchema = z.enum(invitationStatuses);

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
