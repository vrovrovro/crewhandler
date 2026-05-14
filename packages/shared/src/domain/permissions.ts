import type { UserRole } from "./enums";

export const permissions = {
  dashboard: ["dashboard:read"],
  clients: ["clients:create", "clients:read", "clients:update", "clients:delete"],
  interventions: [
    "interventions:create",
    "interventions:read",
    "interventions:update",
    "interventions:delete",
    "interventions:assign",
    "interventions:updateStatus",
  ],
  invoices: ["invoices:create", "invoices:read", "invoices:update", "invoices:markPaid"],
  scheduling: ["scheduling:read", "scheduling:update"],
  attachments: ["attachments:create", "attachments:read"],
  settings: [
    "settings:read",
    "settings:invite",
    "settings:updateRoles",
    "settings:updateWorkspace",
    "settings:updateProfile",
    "settings:removeMembers",
    "settings:revokeInvitations",
    "settings:deleteWorkspace",
  ],
} as const;

export type Permission = (typeof permissions)[keyof typeof permissions][number];

export const rolePermissions: Record<UserRole, Permission[]> = {
  OWNER: [
    ...permissions.dashboard,
    ...permissions.clients,
    ...permissions.interventions,
    ...permissions.invoices,
    ...permissions.scheduling,
    ...permissions.attachments,
    ...permissions.settings,
  ],
  ADMIN: [
    ...permissions.dashboard,
    ...permissions.clients,
    ...permissions.interventions,
    ...permissions.invoices,
    ...permissions.scheduling,
    ...permissions.attachments,
    ...permissions.settings,
  ],
  USER: [
    "interventions:read",
    "interventions:updateStatus",
    "scheduling:read",
    "attachments:create",
    "attachments:read",
    "settings:read",
    "settings:updateProfile",
  ],
};

export const hasPermission = (role: UserRole, permission: Permission) =>
  rolePermissions[role].includes(permission);
