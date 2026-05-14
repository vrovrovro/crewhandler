import { z } from "zod";
import { interventionStatusSchema } from "./common";
import { interventionSchema } from "./interventions";

export const dashboardStatsSchema = z.object({
  totalClients: z.number().int().nonnegative(),
  activeInterventions: z.number().int().nonnegative(),
  completedThisMonth: z.number().int().nonnegative(),
  revenueThisMonth: z.number().nonnegative(),
});

export const dashboardOverviewSchema = z.object({
  stats: dashboardStatsSchema,
  recentInterventions: z.array(interventionSchema).max(10),
  statusBreakdown: z.array(
    z.object({
      status: interventionStatusSchema,
      count: z.number().int().nonnegative(),
    }),
  ),
});
