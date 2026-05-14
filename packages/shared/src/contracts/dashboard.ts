import { dashboardOverviewSchema } from "../schemas/dashboard";
import { defineContract } from "./http";

export const dashboardContracts = {
  overview: defineContract({
    method: "GET",
    path: "/dashboard/overview",
    response: dashboardOverviewSchema,
    auth: true,
  }),
} as const;
