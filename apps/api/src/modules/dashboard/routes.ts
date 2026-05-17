import type { FastifyInstance } from "fastify";
import { createSupabaseAdmin } from "@acme/db";
import { dashboardContracts } from "@acme/shared";
import { requirePermission } from "../../lib/auth.js";

const admin = createSupabaseAdmin();

export const registerDashboardRoutes = async (app: FastifyInstance) => {
  app.get(
    dashboardContracts.overview.path,
    { preHandler: [app.authenticate, requirePermission("dashboard:read")] },
    async (request) => {
      const organizationId = request.user.organizationId;

      const [clients, activeJobs, completedJobs, invoices, recentInterventions, allInterventions] =
        await Promise.all([
          admin.from("clients").select("id", { count: "exact", head: true }).eq("organization_id", organizationId),
          admin
            .from("interventions")
            .select("id", { count: "exact", head: true })
            .eq("organization_id", organizationId)
            .in("status", ["SCHEDULED", "IN_PROGRESS", "ON_HOLD"]),
          admin
            .from("interventions")
            .select("id", { count: "exact", head: true })
            .eq("organization_id", organizationId)
            .eq("status", "COMPLETED"),
          admin
            .from("invoices")
            .select("total, status")
            .eq("organization_id", organizationId)
            .eq("status", "PAID"),
          admin
            .from("interventions")
            .select("*")
            .eq("organization_id", organizationId)
            .order("updated_at", { ascending: false })
            .limit(5),
          admin.from("interventions").select("status").eq("organization_id", organizationId),
        ]);

      const revenueThisMonth = (invoices.data ?? []).reduce(
        (sum, invoice) => sum + Number(invoice.total ?? 0),
        0,
      );

      const statusCounts = (allInterventions.data ?? []).reduce<Record<string, number>>((acc, item) => {
        acc[item.status] = (acc[item.status] ?? 0) + 1;
        return acc;
      }, {});

      return dashboardContracts.overview.response.parse({
        stats: {
          totalClients: clients.count ?? 0,
          activeInterventions: activeJobs.count ?? 0,
          completedThisMonth: completedJobs.count ?? 0,
          revenueThisMonth,
        },
        recentInterventions: (recentInterventions.data ?? []).map((item) => ({
          id: String(item.id),
          organizationId: String(item.organization_id),
          clientId: String(item.client_id),
          assignedTechnicianId: item.assigned_technician_id ?? null,
          title: String(item.title),
          description: item.description ?? null,
          status: item.status,
          priority: item.priority,
          scheduledAt: item.scheduled_at ?? null,
          dueDate: item.due_date ?? null,
          location: item.location ?? null,
          notes: item.notes ?? null,
          createdAt: String(item.created_at),
          updatedAt: String(item.updated_at),
          completedAt: item.completed_at ?? null,
        })),
        statusBreakdown: Object.entries(statusCounts).map(([status, count]) => ({
          status,
          count,
        })),
      });
    },
  );
};
