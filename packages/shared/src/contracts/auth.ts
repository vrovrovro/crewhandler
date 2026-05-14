import {
  acceptInvitationWithPasswordSchema,
  authUserSchema,
  bootstrapOrganizationSchema,
  publicInvitationSchema,
  switchWorkspaceSchema,
  workspaceListSchema,
} from "../schemas/auth";
import { defineContract } from "./http";

export const authContracts = {
  bootstrap: defineContract({
    method: "POST",
    path: "/auth/bootstrap",
    body: bootstrapOrganizationSchema,
    response: authUserSchema,
    auth: true,
  }),
  me: defineContract({
    method: "GET",
    path: "/auth/me",
    response: authUserSchema,
    auth: true,
  }),
  invitation: defineContract({
    method: "GET",
    path: "/auth/invitations/:invitationId",
    response: publicInvitationSchema,
  }),
  acceptInvitationWithPassword: defineContract({
    method: "POST",
    path: "/auth/invitations/:invitationId/accept",
    body: acceptInvitationWithPasswordSchema,
    response: authUserSchema,
  }),
  workspaces: defineContract({
    method: "GET",
    path: "/auth/workspaces",
    response: workspaceListSchema,
    auth: true,
  }),
  switchWorkspace: defineContract({
    method: "POST",
    path: "/auth/workspaces/switch",
    body: switchWorkspaceSchema,
    response: authUserSchema,
    auth: true,
  }),
} as const;
