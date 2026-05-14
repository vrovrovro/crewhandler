import { z } from "zod";
import { roleSchema } from "./common";

export const signUpSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  confirmPassword: z.string().min(8).max(128),
}).refine((values) => values.password === values.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const bootstrapOrganizationSchema = z.object({
  organizationName: z.string().trim().min(2).max(120),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export const publicInvitationSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  organizationName: z.string(),
  email: z.string().email(),
  role: roleSchema,
});

export const acceptInvitationWithPasswordSchema = z.object({
  password: z.string().min(8).max(128),
});

export const workspaceMembershipSchema = z.object({
  organizationId: z.string(),
  organizationName: z.string(),
  role: roleSchema,
  isDefault: z.boolean(),
});

export const workspaceListSchema = z.object({
  workspaces: z.array(workspaceMembershipSchema),
});

export const switchWorkspaceSchema = z.object({
  organizationId: z.string(),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(16),
});

export const authUserSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  fullName: z.string(),
  email: z.string().email(),
  role: roleSchema,
});

export const authTokenPairSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
});

export const authResponseSchema = z.object({
  user: authUserSchema,
  tokens: authTokenPairSchema,
});
