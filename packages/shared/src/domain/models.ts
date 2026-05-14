import type {
  AttachmentKind,
  InterventionPriority,
  InterventionStatus,
  InvoiceStatus,
  UserRole,
} from "./enums";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  organizationId: string;
  fullName: string;
  email: string;
  phone?: string | null;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Client {
  id: string;
  organizationId: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Intervention {
  id: string;
  organizationId: string;
  clientId: string;
  assignedTechnicianId?: string | null;
  title: string;
  description?: string | null;
  status: InterventionStatus;
  priority: InterventionPriority;
  scheduledAt?: string | null;
  dueDate?: string | null;
  location?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
}

export interface JobNote {
  id: string;
  interventionId: string;
  authorId: string;
  content: string;
  createdAt: string;
}

export interface JobAttachment {
  id: string;
  interventionId: string;
  uploaderId: string;
  kind: AttachmentKind;
  fileName: string;
  fileUrl: string;
  createdAt: string;
}

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Invoice {
  id: string;
  organizationId: string;
  interventionId: string;
  clientId: string;
  status: InvoiceStatus;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  issuedAt: string;
  paidAt?: string | null;
  items: InvoiceItem[];
}

export interface ActivityLog {
  id: string;
  organizationId: string;
  actorId: string;
  entityType: string;
  entityId: string;
  action: string;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}
