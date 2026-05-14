"use client";

import { authContracts } from "@acme/shared";
import { Building2, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { StateCard } from "../../../components/feedback/state-card";
import { PageHeader } from "../../../components/layout/page-header";
import { invalidateAuthState, setCachedAuthState } from "../../../lib/auth-state";
import { createAuthedApi } from "../../../lib/api";
import { getAccessToken } from "../../../lib/session-client";
import { supabaseBrowser } from "../../../lib/supabase-browser";
import { clearViewCache } from "../../../lib/view-cache";

type WorkspaceItem = {
  organizationId: string;
  organizationName: string;
  role: "OWNER" | "ADMIN" | "USER";
  isDefault: boolean;
};

export default function WorkspacesPage() {
  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  const load = async () => {
    try {
      const api = createAuthedApi(getAccessToken);
      const result = await api.request(authContracts.workspaces);
      setWorkspaces(result.workspaces);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load your workspaces.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const switchWorkspace = async (workspace: WorkspaceItem) => {
    setSwitchingId(workspace.organizationId);

    try {
      const api = createAuthedApi(getAccessToken);
      const nextUser = await api.request(authContracts.switchWorkspace, {
        body: { organizationId: workspace.organizationId },
      });

      const { data } = await supabaseBrowser.auth.refreshSession();
      if (data.session) {
        setCachedAuthState({
          kind: "complete",
          session: data.session,
          email: data.session.user.email ?? null,
          role: nextUser.role,
          checkedAt: Date.now(),
          accessToken: data.session.access_token,
        });
      } else {
        invalidateAuthState();
      }

      invalidateAuthState();
      clearViewCache();
      window.location.assign(nextUser.role === "USER" ? "/interventions" : "/dashboard");
    } catch (switchError) {
      setError(switchError instanceof Error ? switchError.message : "Unable to switch workspace.");
    } finally {
      setSwitchingId(null);
    }
  };

  if (loading) {
    return <StateCard title="Loading workspaces" description="Fetching the workspaces you can access." />;
  }

  if (error && !workspaces.length) {
    return <StateCard title="Unable to load workspaces" description={error} />;
  }

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Workspaces"
        title="Switch workspaces"
        description="Move between every workspace your account can access. Your current workspace controls the data and role shown across the app."
      />

      {error ? <StateCard title="Action error" description={error} /> : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {workspaces.map((workspace) => (
          <article
            key={workspace.organizationId}
            className={`rounded-[28px] border p-6 shadow-[0_12px_40px_rgba(15,23,42,0.04)] ${
              workspace.isDefault ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div
                  className={`inline-flex rounded-2xl p-3 ${
                    workspace.isDefault ? "bg-white/10 text-white" : "bg-slate-100 text-slate-700"
                  }`}
                >
                  <Building2 className="h-5 w-5" />
                </div>
                <h2 className={`mt-4 text-xl font-semibold ${workspace.isDefault ? "text-white" : "text-slate-950"}`}>
                  {workspace.organizationName}
                </h2>
                <p className={`mt-2 text-sm ${workspace.isDefault ? "text-white/70" : "text-slate-500"}`}>
                  Role: {workspace.role.toLowerCase()}
                </p>
              </div>
              {workspace.isDefault ? <CheckCircle2 className="h-5 w-5 text-emerald-300" /> : null}
            </div>

            <button
              type="button"
              onClick={() => switchWorkspace(workspace)}
              disabled={workspace.isDefault || switchingId === workspace.organizationId}
              className={`mt-6 w-full rounded-2xl px-5 py-3 text-sm font-medium ${
                workspace.isDefault
                  ? "cursor-default border border-white/10 bg-white/10 text-white/70"
                  : "bg-slate-950 text-white"
              }`}
            >
              {workspace.isDefault
                ? "Current workspace"
                : switchingId === workspace.organizationId
                  ? "Switching..."
                  : "Switch to workspace"}
            </button>
          </article>
        ))}
      </section>
    </div>
  );
}
