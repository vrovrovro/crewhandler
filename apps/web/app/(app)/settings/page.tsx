"use client";

import { authContracts, settingsContracts, settingsOverviewSchema, type UserRole } from "@acme/shared";
import {
  Bell,
  Building2,
  Lock,
  Plus,
  Shield,
  Smartphone,
  UserCog,
  Users,
  Wrench,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { StateCard } from "../../../components/feedback/state-card";
import { AppSelect } from "../../../components/inputs/app-select";
import { Modal } from "../../../components/overlay/modal";
import { createAuthedApi } from "../../../lib/api";
import { invalidateAuthState, peekAuthState, resolveAuthState } from "../../../lib/auth-state";
import { getAccessToken } from "../../../lib/session-client";
import { clearViewCache, readViewCache, writeViewCache } from "../../../lib/view-cache";
import { supabaseBrowser } from "../../../lib/supabase-browser";

type SettingsOverview = z.infer<typeof settingsOverviewSchema>;
type SettingsTab = "workspace" | "notifications" | "team" | "integrations" | "security" | "profile";

const tabs: Array<{ id: SettingsTab; label: string; icon: typeof Building2 }> = [
  { id: "workspace", label: "Workspace", icon: Building2 },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "team", label: "Team", icon: Users },
  { id: "integrations", label: "Integrations", icon: Wrench },
  { id: "security", label: "Security", icon: Shield },
  { id: "profile", label: "Profile", icon: UserCog },
];

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_12px_40px_rgba(15,23,42,0.04)] sm:p-6">
      <div className="max-w-2xl">
        <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function StatCard({
  label,
  value,
  limit,
}: {
  label: string;
  value: string;
  limit: string;
}) {
  return (
    <article className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{label}</p>
      <p className="mt-4 text-2xl font-semibold text-slate-950">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{limit}</p>
    </article>
  );
}

function StatusPill({
  tone,
  children,
}: {
  tone: "neutral" | "success" | "warning";
  children: React.ReactNode;
}) {
  const styles =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-slate-200 bg-slate-50 text-slate-600";

  return <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${styles}`}>{children}</span>;
}

export default function SettingsPage() {
  const [data, setData] = useState<SettingsOverview | null>(() => readViewCache<SettingsOverview>("settings"));
  const [role, setRole] = useState<UserRole | null>(() => peekAuthState()?.role ?? null);
  const [workspaceMemberships, setWorkspaceMemberships] = useState<
    Array<{ organizationId: string; organizationName: string; role: UserRole; isDefault: boolean }>
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<SettingsTab>("workspace");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"ADMIN" | "USER">("USER");
  const [inviteSaving, setInviteSaving] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceSaving, setWorkspaceSaving] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [workspaceDeleteConfirm, setWorkspaceDeleteConfirm] = useState("");
  const [workspaceDeleting, setWorkspaceDeleting] = useState(false);

  const load = async () => {
    try {
      const api = createAuthedApi(getAccessToken);
      const [result, memberships] = await Promise.all([
        api.request(settingsContracts.overview),
        api.request(authContracts.workspaces),
      ]);
      setData(result);
      setWorkspaceMemberships(memberships.workspaces);
      setWorkspaceName(result.organization.name);
      setProfileName(result.profile.fullName);
      setProfilePhone(result.profile.phone ?? "");
      writeViewCache("settings", result);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load settings");
    }
  };

  useEffect(() => {
    resolveAuthState(true).then((state) => setRole(state.role));
    load();
  }, []);

  const buildInviteLink = (invitationId: string) => {
    if (typeof window === "undefined") return "";
    const url = new URL("/invite", window.location.origin);
    url.searchParams.set("invitation", invitationId);
    return url.toString();
  };

  const copyInviteLink = async (invitationId: string) => {
    try {
      const link = buildInviteLink(invitationId);
      if (!link) {
        throw new Error("Invite link is not available right now.");
      }

      await navigator.clipboard.writeText(link);
      setNotice("Invite link copied. Share it directly if email delivery is delayed.");
      setError(null);
    } catch (copyError) {
      setError(copyError instanceof Error ? copyError.message : "Unable to copy invite link");
    }
  };

  const inviteMember = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setInviteSaving(true);
    try {
      const api = createAuthedApi(getAccessToken);
      await api.request(settingsContracts.invite, {
        body: {
          email: inviteEmail,
          role: inviteRole,
        },
      });
      setInviteEmail("");
      setInviteRole("USER");
      setInviteOpen(false);
      setNotice("Invite created. Use the copy link action below if the email does not arrive immediately.");
      await load();
    } catch (inviteError) {
      setError(inviteError instanceof Error ? inviteError.message : "Unable to send invite");
    } finally {
      setInviteSaving(false);
    }
  };

  const updateMemberRole = async (memberId: string, nextRole: "ADMIN" | "USER") => {
    try {
      const api = createAuthedApi(getAccessToken);
      await api.request(settingsContracts.updateMemberRole, {
        pathParams: { memberId },
        body: { role: nextRole },
      });
      setNotice("Member role updated.");
      await load();
    } catch (roleError) {
      setError(roleError instanceof Error ? roleError.message : "Unable to update role");
    }
  };

  const removeMember = async (memberId: string) => {
    try {
      const api = createAuthedApi(getAccessToken);
      await api.request(settingsContracts.removeMember, {
        pathParams: { memberId },
      });
      setNotice("Member removed from this workspace.");
      await load();
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Unable to remove member");
    }
  };

  const revokeInvitation = async (invitationId: string) => {
    try {
      const api = createAuthedApi(getAccessToken);
      await api.request(settingsContracts.revokeInvitation, {
        pathParams: { invitationId },
      });
      setNotice("Invitation revoked.");
      await load();
    } catch (revokeError) {
      setError(revokeError instanceof Error ? revokeError.message : "Unable to revoke invitation");
    }
  };

  const saveWorkspace = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setWorkspaceSaving(true);
    try {
      const api = createAuthedApi(getAccessToken);
      const organization = await api.request(settingsContracts.updateWorkspace, {
        body: { name: workspaceName },
      });
      setData((current) => {
        if (!current) return current;
        const next = { ...current, organization };
        writeViewCache("settings", next);
        return next;
      });
      setNotice("Workspace details updated.");
      setError(null);
    } catch (workspaceError) {
      setError(workspaceError instanceof Error ? workspaceError.message : "Unable to update workspace");
    } finally {
      setWorkspaceSaving(false);
    }
  };

  const saveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProfileSaving(true);
    try {
      const api = createAuthedApi(getAccessToken);
      const profile = await api.request(settingsContracts.updateProfile, {
        body: {
          fullName: profileName,
          phone: profilePhone,
        },
      });
      setData((current) => {
        if (!current) return current;
        const next = { ...current, profile };
        writeViewCache("settings", next);
        return next;
      });
      setNotice("Profile updated.");
      setError(null);
    } catch (profileError) {
      setError(profileError instanceof Error ? profileError.message : "Unable to update profile");
    } finally {
      setProfileSaving(false);
    }
  };

  const switchWorkspace = async (organizationId: string) => {
    try {
      const api = createAuthedApi(getAccessToken);
      await api.request(authContracts.switchWorkspace, {
        body: { organizationId },
      });

      await supabaseBrowser.auth.refreshSession();
      invalidateAuthState();
      clearViewCache();
      window.location.assign("/settings");
    } catch (switchError) {
      setError(switchError instanceof Error ? switchError.message : "Unable to switch workspace");
    }
  };

  const deleteWorkspace = async () => {
    if (!data) return;

    setWorkspaceDeleting(true);
    try {
      const api = createAuthedApi(getAccessToken);
      await api.request(settingsContracts.deleteWorkspace, {
        body: { confirmation: workspaceDeleteConfirm },
      });

      await supabaseBrowser.auth.signOut();
      clearViewCache();
      window.location.assign("/login");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete workspace");
    } finally {
      setWorkspaceDeleting(false);
    }
  };

  const usageCards = useMemo(() => {
    if (!data) return [];

    return [
      {
        label: "Jobs this month",
        value: data.organization.usage.jobsThisMonth.usedLabel,
        limit: `${data.organization.usage.jobsThisMonth.usedLabel} / ${data.organization.usage.jobsThisMonth.limitLabel}`,
      },
      {
        label: "Team members",
        value: data.organization.usage.teamMembers.usedLabel,
        limit: `${data.organization.usage.teamMembers.usedLabel} / ${data.organization.usage.teamMembers.limitLabel}`,
      },
      {
        label: "Storage used",
        value: data.organization.usage.storageUsed.usedLabel,
        limit: `${data.organization.usage.storageUsed.usedLabel} / ${data.organization.usage.storageUsed.limitLabel}`,
      },
      {
        label: "API calls",
        value: data.organization.usage.apiCalls.usedLabel,
        limit: `${data.organization.usage.apiCalls.usedLabel} / ${data.organization.usage.apiCalls.limitLabel}`,
      },
    ];
  }, [data]);

  const activeWorkspaceRole =
    workspaceMemberships.find((workspace) => workspace.isDefault)?.role ?? role;

  const visibleTabs =
    activeWorkspaceRole === "USER"
      ? tabs.filter((tab) => ["workspace", "profile", "security"].includes(tab.id))
      : tabs;

  useEffect(() => {
    if (activeWorkspaceRole === "USER" && !["workspace", "profile", "security"].includes(activeTab)) {
      setActiveTab("workspace");
    }
  }, [activeTab, activeWorkspaceRole]);

  if (error && !data) {
    return <StateCard title="Unable to load settings" description={error} />;
  }

  if (!data) {
    return <StateCard title="Loading settings" description="Fetching workspace controls and account preferences." />;
  }

  return (
    <div className="space-y-4">
      <section className="grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="rounded-[28px] border border-slate-200 bg-white p-3 shadow-[0_12px_40px_rgba(15,23,42,0.04)]">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-1">
            {visibleTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm transition ${
                    isActive
                      ? "bg-slate-950 text-white shadow-[0_18px_48px_rgba(15,23,42,0.16)]"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </aside>

        <div className="space-y-4">
          {error ? <StateCard title="Action error" description={error} /> : null}
          {notice ? <StateCard title="Update" description={notice} /> : null}

          {activeTab === "workspace" ? (
            <div className="space-y-4">
              <SectionCard
                title="Workspace identity"
                description="Update how your workspace appears throughout the platform. The workspace ID stays fixed and helps identify this environment in integrations and support."
              >
                <form onSubmit={saveWorkspace} className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
                  <label className="block space-y-2 text-sm">
                    <span className="font-medium text-slate-700">Workspace name</span>
                    <input
                      value={workspaceName}
                      onChange={(event) => setWorkspaceName(event.target.value)}
                      placeholder="Sam's Bakery"
                      disabled={activeWorkspaceRole === "USER"}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900"
                    />
                  </label>
                  <label className="block space-y-2 text-sm">
                    <span className="font-medium text-slate-700">Workspace ID</span>
                    <input
                      value={data.organization.id}
                      readOnly
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-500"
                    />
                  </label>
                  <div className="lg:col-span-2 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Workspace plan</p>
                      <p className="mt-2 text-lg font-semibold text-slate-950">{data.organization.plan.name}</p>
                      <p className="mt-1 text-sm text-slate-500">{data.organization.plan.description}</p>
                    </div>
                    {activeWorkspaceRole !== "USER" ? (
                      <button
                        className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white"
                        disabled={workspaceSaving}
                      >
                        {workspaceSaving ? "Saving..." : "Save workspace"}
                      </button>
                    ) : null}
                  </div>
                </form>
              </SectionCard>

              <SectionCard
                title="Switch workspace"
                description="Move between any workspace your account can access. We force a clean refresh after switching so your role, navigation, and data scope all match the active workspace immediately."
              >
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {workspaceMemberships.map((workspace) => (
                    <article
                      key={workspace.organizationId}
                      className={`rounded-[24px] border p-5 ${
                        workspace.isDefault ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-slate-50"
                      }`}
                    >
                      <p className={`text-base font-semibold ${workspace.isDefault ? "text-white" : "text-slate-950"}`}>
                        {workspace.organizationName}
                      </p>
                      <p className={`mt-2 text-sm ${workspace.isDefault ? "text-white/70" : "text-slate-500"}`}>
                        Role: {workspace.role.toLowerCase()}
                      </p>
                      <button
                        type="button"
                        onClick={() => switchWorkspace(workspace.organizationId)}
                        disabled={workspace.isDefault}
                        className={`mt-4 w-full rounded-2xl px-4 py-3 text-sm font-medium ${
                          workspace.isDefault
                            ? "border border-white/10 bg-white/10 text-white/70"
                            : "bg-slate-950 text-white"
                        }`}
                      >
                        {workspace.isDefault ? "Current workspace" : "Switch workspace"}
                      </button>
                    </article>
                  ))}
                </div>
              </SectionCard>

              <SectionCard
                title="Workspace usage"
                description="Monitor the key limits and throughput numbers that matter for day-to-day operations."
              >
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {usageCards.map((card) => (
                    <StatCard key={card.label} label={card.label} value={card.value} limit={card.limit} />
                  ))}
                </div>
              </SectionCard>
            </div>
          ) : null}

          {activeTab === "notifications" ? (
            <div className="space-y-4">
              <SectionCard
                title="Email notifications"
                description="Control which operational messages the workspace receives by email."
              >
                <div className="grid gap-4 lg:grid-cols-2">
                  <article className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-base font-semibold text-slate-950">{data.organization.notifications.email.label}</p>
                        <p className="mt-2 text-sm leading-6 text-slate-500">
                          {data.organization.notifications.email.description}
                        </p>
                      </div>
                      <StatusPill tone="success">Enabled</StatusPill>
                    </div>
                  </article>
                  <article className="rounded-[24px] border border-slate-200 bg-white p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-base font-semibold text-slate-950">Digest cadence</p>
                        <p className="mt-2 text-sm leading-6 text-slate-500">
                          Daily delivery summaries and invite notifications are sent in near real time.
                        </p>
                      </div>
                      <StatusPill tone="neutral">Default</StatusPill>
                    </div>
                  </article>
                </div>
              </SectionCard>

              <SectionCard
                title="SMS notifications"
                description="SMS alerting will be powered by Twilio when your messaging credentials are configured."
              >
                <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <Smartphone className="mt-1 h-5 w-5 text-slate-500" />
                      <div>
                        <p className="font-semibold text-slate-950">{data.organization.notifications.sms.label}</p>
                        <p className="mt-2 text-sm leading-6 text-slate-500">
                          {data.organization.notifications.sms.description}
                        </p>
                      </div>
                    </div>
                    <StatusPill tone="warning">Coming soon</StatusPill>
                  </div>
                </div>
              </SectionCard>
            </div>
          ) : null}

          {activeTab === "team" ? (
            <div className="space-y-4">
              <SectionCard
                title="Team members"
                description="Owners and admins can manage workspace access. Users are limited to their assigned interventions."
              >
                <div className="overflow-hidden rounded-[24px] border border-slate-200">
                  <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">Workspace members</p>
                    </div>
                    {activeWorkspaceRole !== "USER" ? (
                      <button
                        onClick={() => setInviteOpen(true)}
                        className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white"
                      >
                        <Plus className="h-4 w-4" />
                        Invite teammate
                      </button>
                    ) : null}
                  </div>
                  <div className="hidden grid-cols-[minmax(0,1.4fr)_160px_180px_140px_120px] gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 md:grid">
                    <span>Team member</span>
                    <span>Role</span>
                    <span>Joined</span>
                    <span>Access</span>
                    <span>Action</span>
                  </div>
                  {data.members.map((member) => {
                    const canEdit =
                      member.role !== "OWNER" &&
                      (activeWorkspaceRole === "OWNER" ||
                        (activeWorkspaceRole === "ADMIN" && member.role === "USER"));

                    return (
                      <article
                        key={member.id}
                        className="grid gap-4 border-t border-slate-200 px-4 py-4 first:border-t-0 md:grid-cols-[minmax(0,1.4fr)_160px_180px_140px_120px] md:items-center"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-slate-950">{member.fullName}</p>
                          <p className="mt-1 truncate text-sm text-slate-500">{member.email}</p>
                        </div>
                        <div>
                          {canEdit ? (
                            <AppSelect
                              value={member.role}
                              onChange={(event) => updateMemberRole(member.id, event.target.value as "ADMIN" | "USER")}
                              className="bg-white"
                            >
                              {activeWorkspaceRole === "OWNER" ? <option value="ADMIN">Admin</option> : null}
                              <option value="USER">User</option>
                            </AppSelect>
                          ) : (
                            <StatusPill tone={member.role === "OWNER" ? "warning" : "neutral"}>{member.role}</StatusPill>
                          )}
                        </div>
                        <div className="text-sm text-slate-500">{new Date(member.createdAt).toLocaleDateString()}</div>
                        <div className="text-sm text-slate-400">
                          {member.role === "OWNER" ? "Workspace owner" : canEdit ? "Editable" : "Protected"}
                        </div>
                        <div>
                          {activeWorkspaceRole !== "USER" && member.role !== "OWNER" ? (
                            <button
                              type="button"
                              onClick={() => removeMember(member.id)}
                              className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
                            >
                              Remove
                            </button>
                          ) : null}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </SectionCard>

              <SectionCard
                title="Pending invitations"
                description="Track every invite sent to the workspace, copy a direct setup link, and see the current status in one table."
              >
                <div className="overflow-hidden rounded-[24px] border border-slate-200">
                  <div className="hidden grid-cols-[minmax(0,1.3fr)_120px_140px_200px_220px] gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 md:grid">
                    <span>Email</span>
                    <span>Role</span>
                    <span>Status</span>
                    <span>Sent</span>
                    <span>Actions</span>
                  </div>
                  {data.invitations.length ? (
                    data.invitations.map((invite) => (
                      <article
                        key={invite.id}
                        className="grid gap-4 border-t border-slate-200 px-4 py-4 first:border-t-0 md:grid-cols-[minmax(0,1.3fr)_120px_140px_200px_220px] md:items-center"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-950">{invite.email}</p>
                        </div>
                        <div className="text-sm text-slate-600">{invite.role}</div>
                        <div>
                          <StatusPill tone={invite.status === "ACCEPTED" ? "success" : "neutral"}>
                            {invite.status}
                          </StatusPill>
                        </div>
                        <div className="text-sm text-slate-500">{new Date(invite.createdAt).toLocaleString()}</div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => copyInviteLink(invite.id)}
                            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700"
                          >
                            Copy link
                          </button>
                          {invite.status === "PENDING" ? (
                            <button
                              type="button"
                              onClick={() => revokeInvitation(invite.id)}
                              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700"
                            >
                              Revoke
                            </button>
                          ) : null}
                        </div>
                      </article>
                    ))
                  ) : (
                    <p className="px-4 py-5 text-sm text-slate-500">No invitations have been sent yet.</p>
                  )}
                </div>
              </SectionCard>
            </div>
          ) : null}

          {activeTab === "integrations" ? (
            <SectionCard
              title="Integrations"
              description="Connect the services that support messaging, scheduling, and document workflows."
            >
              <div className="grid gap-4 lg:grid-cols-3">
                {data.organization.integrations.map((integration) => (
                  <article key={integration.name} className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-base font-semibold text-slate-950">{integration.name}</p>
                      <StatusPill
                        tone={
                          integration.status === "CONNECTED"
                            ? "success"
                            : integration.status === "AVAILABLE"
                              ? "neutral"
                              : "warning"
                        }
                      >
                        {integration.status.replace("_", " ")}
                      </StatusPill>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-500">{integration.description}</p>
                  </article>
                ))}
              </div>
            </SectionCard>
          ) : null}

          {activeTab === "security" ? (
            <div className="space-y-4">
              <SectionCard
                title="Authentication posture"
                description="Review the login methods and verification signals protecting your workspace."
              >
                <div className="grid gap-4 lg:grid-cols-3">
                  <article className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                    <p className="text-sm font-medium text-slate-500">Email verification</p>
                    <p className="mt-3 text-xl font-semibold text-slate-950">
                      {data.organization.security.emailVerified ? "Verified" : "Pending"}
                    </p>
                  </article>
                  <article className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                    <p className="text-sm font-medium text-slate-500">Google sign-in</p>
                    <p className="mt-3 text-xl font-semibold text-slate-950">
                      {data.organization.security.oauthEnabled ? "Enabled" : "Not connected"}
                    </p>
                  </article>
                  <article className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                    <p className="text-sm font-medium text-slate-500">Password sign-in</p>
                    <p className="mt-3 text-xl font-semibold text-slate-950">
                      {data.organization.security.passwordEnabled ? "Enabled" : "Disabled"}
                    </p>
                  </article>
                </div>
              </SectionCard>

              <SectionCard
                title="Recommended actions"
                description="Use these next steps to keep the account and workspace safer as the team grows."
              >
                <div className="space-y-3">
                  {data.organization.security.recommendedActions.map((item) => (
                    <article
                      key={item}
                      className="flex items-start gap-3 rounded-[24px] border border-slate-200 bg-slate-50 p-4"
                    >
                      <Lock className="mt-0.5 h-4 w-4 text-slate-500" />
                      <p className="text-sm leading-6 text-slate-600">{item}</p>
                    </article>
                  ))}
                </div>
              </SectionCard>
            </div>
          ) : null}

          {activeTab === "profile" ? (
            <SectionCard
              title="Profile settings"
              description="Keep your personal details current so teammates, notifications, and activity logs stay accurate."
            >
              <form onSubmit={saveProfile} className="grid gap-4 lg:grid-cols-2">
                <label className="block space-y-2 text-sm">
                  <span className="font-medium text-slate-700">Full name</span>
                  <input
                    value={profileName}
                    onChange={(event) => setProfileName(event.target.value)}
                    placeholder="Alex Johnson"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900"
                  />
                </label>
                <label className="block space-y-2 text-sm">
                  <span className="font-medium text-slate-700">Email</span>
                  <input
                    value={data.profile.email}
                    readOnly
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-500"
                  />
                </label>
                <label className="block space-y-2 text-sm lg:col-span-2">
                  <span className="font-medium text-slate-700">Phone</span>
                  <input
                    value={profilePhone}
                    onChange={(event) => setProfilePhone(event.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900"
                  />
                </label>
                <div className="lg:col-span-2 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-sm text-slate-500">
                    Profile updates sync your name across workspace membership and activity views.
                  </div>
                  <button
                    className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white"
                    disabled={profileSaving}
                  >
                    {profileSaving ? "Saving..." : "Save profile"}
                  </button>
                </div>
              </form>
            </SectionCard>
          ) : null}

          {activeTab === "workspace" && activeWorkspaceRole === "OWNER" ? (
            <SectionCard
              title="Danger zone"
              description="Deleting a workspace permanently removes its clients, interventions, invoices, team memberships, and stored operations data."
            >
              <div className="space-y-4 rounded-[24px] border border-red-200 bg-red-50 p-5">
                <label className="block space-y-2 text-sm">
                  <span className="font-medium text-slate-700">
                    Type <span className="font-semibold">{data.organization.name}</span> to confirm
                  </span>
                  <input
                    value={workspaceDeleteConfirm}
                    onChange={(event) => setWorkspaceDeleteConfirm(event.target.value)}
                    placeholder={data.organization.name}
                    className="w-full rounded-2xl border border-red-200 bg-white px-4 py-3 text-slate-900"
                  />
                </label>
                <button
                  type="button"
                  onClick={deleteWorkspace}
                  disabled={workspaceDeleting}
                  className="rounded-2xl bg-red-600 px-5 py-3 text-sm font-medium text-white"
                >
                  {workspaceDeleting ? "Deleting..." : "Delete workspace"}
                </button>
              </div>
            </SectionCard>
          ) : null}
        </div>
      </section>

      {activeWorkspaceRole !== "USER" ? (
        <Modal
          open={inviteOpen}
          onClose={() => setInviteOpen(false)}
          title="Invite teammate"
          description="Owners can invite admins or users. Admins can invite users only."
        >
          <form onSubmit={inviteMember} className="space-y-4">
            <label className="block space-y-2 text-sm">
              <span>Email</span>
              <input
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                placeholder="person@company.com"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
              />
            </label>
            <label className="block space-y-2 text-sm">
              <span>Role</span>
              <AppSelect
                value={inviteRole}
                onChange={(event) => setInviteRole(event.target.value as "ADMIN" | "USER")}
                className="bg-white"
              >
                {activeWorkspaceRole === "OWNER" ? <option value="ADMIN">Admin</option> : null}
                <option value="USER">User</option>
              </AppSelect>
            </label>
            <button className="w-full rounded-2xl bg-slate-950 px-5 py-3 font-medium text-white">
              {inviteSaving ? "Sending..." : "Send invite"}
            </button>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
