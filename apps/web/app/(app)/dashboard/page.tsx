"use client";

import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { createAuthedApi, apiContracts } from "../../../lib/api";
import { getAccessToken } from "../../../lib/session-client";
import { StatCard } from "../../../components/dashboard/stat-card";
import { DataTable } from "../../../components/tables/data-table";
import { LoadingGrid } from "../../../components/feedback/loading-grid";
import { StateCard } from "../../../components/feedback/state-card";
import { dashboardOverviewSchema } from "@acme/shared";
import { z } from "zod";
import { readViewCache, writeViewCache } from "../../../lib/view-cache";

type DashboardOverview = z.infer<typeof dashboardOverviewSchema>;

export default function DashboardPage() {
  const [data, setData] = useState<DashboardOverview | null>(() => readViewCache<DashboardOverview>("dashboard"));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!readViewCache<DashboardOverview>("dashboard"));

  useEffect(() => {
    const load = async () => {
      try {
        const api = createAuthedApi(getAccessToken);
        const result = await api.request(apiContracts.dashboard);
        setData(result);
        writeViewCache("dashboard", result);
        setError(null);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load dashboard");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  if (loading) return <LoadingGrid />;

  if (error || !data) {
    return (
      <StateCard
        title="Dashboard not connected yet"
        description={
          error ??
          "The page loaded, but the API did not return dashboard data. This usually means the session, API URL, or seeded app records still need attention."
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total clients" value={String(data.stats.totalClients)} hint="Active organization records" />
        <StatCard
          label="Active interventions"
          value={String(data.stats.activeInterventions)}
          hint="Scheduled, in progress, or on hold"
          tone="accent"
        />
        <StatCard
          label="Completed this month"
          value={String(data.stats.completedThisMonth)}
          hint="Closed successfully"
        />
        <StatCard
          label="$ this month"
          value={`$${data.stats.revenueThisMonth.toLocaleString()}`}
          hint="Booked revenue this month"
          tone="coral"
        />
      </section>

      <DataTable
        title="Recent interventions"
        subtitle="Live data from /dashboard/overview"
        columns={["Job", "Status", "Priority", "Scheduled"]}
        rows={data.recentInterventions.map((item) => [
          item.title,
          item.status,
          item.priority,
          item.scheduledAt ? new Date(item.scheduledAt).toLocaleString() : "Not scheduled",
        ])}
        actions={
          <button className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-600">
            View queue
            <ArrowRight className="h-4 w-4" />
          </button>
        }
      />
    </div>
  );
}
