import { defineContract } from "./http";
import {
  acceptInvitationSchema,
  createInvitationSchema,
  deleteWorkspaceSchema,
  organizationInvitationSchema,
  organizationMemberSchema,
  pendingAccessSchema,
  settingsOverviewSchema,
  settingsProfileSchema,
  updateMemberRoleSchema,
  updateProfileSchema,
  updateWorkspaceSchema,
} from "../schemas/settings";

export const settingsContracts = {
  overview: defineContract({
    method: "GET",
    path: "/settings/users",
    response: settingsOverviewSchema,
    auth: true,
  }),
  invite: defineContract({
    method: "POST",
    path: "/settings/invitations",
    body: createInvitationSchema,
    response: organizationInvitationSchema,
    auth: true,
  }),
  updateMemberRole: defineContract({
    method: "PATCH",
    path: "/settings/members/:memberId/role",
    body: updateMemberRoleSchema,
    response: organizationMemberSchema,
    auth: true,
  }),
  updateWorkspace: defineContract({
    method: "PATCH",
    path: "/settings/workspace",
    body: updateWorkspaceSchema,
    response: settingsOverviewSchema.shape.organization,
    auth: true,
  }),
  updateProfile: defineContract({
    method: "PATCH",
    path: "/settings/profile",
    body: updateProfileSchema,
    response: settingsProfileSchema,
    auth: true,
  }),
  removeMember: defineContract({
    method: "DELETE",
    path: "/settings/members/:memberId",
    response: organizationMemberSchema,
    auth: true,
  }),
  revokeInvitation: defineContract({
    method: "DELETE",
    path: "/settings/invitations/:invitationId",
    response: organizationInvitationSchema,
    auth: true,
  }),
  deleteWorkspace: defineContract({
    method: "DELETE",
    path: "/settings/workspace",
    body: deleteWorkspaceSchema,
    response: settingsOverviewSchema.shape.organization,
    auth: true,
  }),
  pendingAccess: defineContract({
    method: "GET",
    path: "/auth/pending-access",
    response: pendingAccessSchema,
    auth: true,
  }),
  acceptInvitation: defineContract({
    method: "POST",
    path: "/auth/accept-invitation",
    body: acceptInvitationSchema,
    response: pendingAccessSchema,
    auth: true,
  }),
} as const;
