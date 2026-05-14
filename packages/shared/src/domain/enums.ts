export const userRoles = ["OWNER", "ADMIN", "USER"] as const;
export type UserRole = (typeof userRoles)[number];

export const invitationStatuses = ["PENDING", "ACCEPTED", "REVOKED"] as const;
export type InvitationStatus = (typeof invitationStatuses)[number];

export const interventionStatuses = [
  "DRAFT",
  "SCHEDULED",
  "IN_PROGRESS",
  "ON_HOLD",
  "COMPLETED",
  "CANCELLED",
] as const;
export type InterventionStatus = (typeof interventionStatuses)[number];

export const interventionPriorities = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export type InterventionPriority = (typeof interventionPriorities)[number];

export const invoiceStatuses = ["DRAFT", "SENT", "PAID", "OVERDUE", "VOID"] as const;
export type InvoiceStatus = (typeof invoiceStatuses)[number];

export const attachmentKinds = ["PHOTO", "DOCUMENT"] as const;
export type AttachmentKind = (typeof attachmentKinds)[number];
