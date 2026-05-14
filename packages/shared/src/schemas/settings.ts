import { z } from "zod";
import { invitationStatusSchema, roleSchema } from "./common";

export const organizationMemberSchema = z.object({
  id: z.string(),
  userId: z.string(),
  email: z.string().email(),
  fullName: z.string(),
  role: roleSchema,
  isActive: z.boolean(),
  createdAt: z.string().datetime({ offset: true }),
});

export const organizationInvitationSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  role: roleSchema,
  status: invitationStatusSchema,
  createdAt: z.string().datetime({ offset: true }),
  acceptedAt: z.string().datetime({ offset: true }).nullable().optional(),
});

export const workspaceUsageMetricSchema = z.object({
  used: z.number().nonnegative(),
  usedLabel: z.string(),
  limitLabel: z.string(),
});

export const workspacePlanSchema = z.object({
  name: z.string(),
  description: z.string(),
});

export const notificationChannelSchema = z.object({
  enabled: z.boolean(),
  label: z.string(),
  description: z.string(),
});

export const integrationStatusSchema = z.object({
  name: z.string(),
  status: z.enum(["CONNECTED", "AVAILABLE", "COMING_SOON"]),
  description: z.string(),
});

export const securityOverviewSchema = z.object({
  emailVerified: z.boolean(),
  oauthEnabled: z.boolean(),
  passwordEnabled: z.boolean(),
  recommendedActions: z.array(z.string()),
});

export const settingsProfileSchema = z.object({
  fullName: z.string(),
  email: z.string().email(),
  phone: z.string().nullable(),
});

export const settingsOverviewSchema = z.object({
  organization: z.object({
    id: z.string(),
    name: z.string(),
    plan: workspacePlanSchema,
    usage: z.object({
      jobsThisMonth: workspaceUsageMetricSchema,
      teamMembers: workspaceUsageMetricSchema,
      storageUsed: workspaceUsageMetricSchema,
      apiCalls: workspaceUsageMetricSchema,
    }),
    notifications: z.object({
      email: notificationChannelSchema,
      sms: notificationChannelSchema,
    }),
    integrations: z.array(integrationStatusSchema),
    security: securityOverviewSchema,
  }),
  profile: settingsProfileSchema,
  members: z.array(organizationMemberSchema),
  invitations: z.array(organizationInvitationSchema),
});

export const createInvitationSchema = z.object({
  email: z.string().email(),
  role: roleSchema.refine((role) => role !== "OWNER", {
    message: "Invitations can only create admins or users",
  }),
});

export const updateMemberRoleSchema = z.object({
  role: roleSchema.refine((role) => role !== "OWNER", {
    message: "Owner role cannot be assigned from this action",
  }),
});

export const pendingAccessSchema = z.object({
  invitation: z
    .object({
      id: z.string(),
      organizationId: z.string(),
      organizationName: z.string(),
      email: z.string().email(),
      role: roleSchema,
    })
    .nullable(),
});

export const acceptInvitationSchema = z.object({
  invitationId: z.string(),
});

export const updateWorkspaceSchema = z.object({
  name: z.string().trim().min(2).max(120),
});

export const updateProfileSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  phone: z
    .string()
    .trim()
    .max(32)
    .transform((value) => value || null)
    .nullable()
    .optional(),
});

export const deleteWorkspaceSchema = z.object({
  confirmation: z.string().trim().min(2),
});
