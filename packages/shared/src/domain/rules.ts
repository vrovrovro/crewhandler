import type { InterventionStatus, UserRole } from "./enums";

const transitionMap: Record<InterventionStatus, InterventionStatus[]> = {
  DRAFT: ["SCHEDULED", "CANCELLED"],
  SCHEDULED: ["IN_PROGRESS", "ON_HOLD", "CANCELLED"],
  IN_PROGRESS: ["ON_HOLD", "COMPLETED", "CANCELLED"],
  ON_HOLD: ["SCHEDULED", "IN_PROGRESS", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

export const canTransitionInterventionStatus = (
  currentStatus: InterventionStatus,
  nextStatus: InterventionStatus,
) => transitionMap[currentStatus].includes(nextStatus);

export const canManageBilling = (role: UserRole) => role === "OWNER" || role === "ADMIN";

export const isFieldRole = (role: UserRole) => role === "USER";
