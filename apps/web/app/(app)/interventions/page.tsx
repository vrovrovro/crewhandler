"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye, LayoutGrid, List, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import {
  canTransitionInterventionStatus,
  clientContracts,
  clientListResponseSchema,
  createInterventionSchema,
  interventionContracts,
  interventionListResponseSchema,
  interventionStatuses,
  settingsContracts,
  settingsOverviewSchema,
} from "@acme/shared";
import { createAuthedApi, apiContracts } from "../../../lib/api";
import { getAccessToken } from "../../../lib/session-client";
import { InterventionForm } from "../../../components/forms/intervention-form";
import { Modal } from "../../../components/overlay/modal";
import { DataTable } from "../../../components/tables/data-table";
import { StateCard } from "../../../components/feedback/state-card";
import { MobileKebabMenu } from "../../../components/menus/mobile-kebab-menu";
import { z } from "zod";
import { readViewCache, writeViewCache } from "../../../lib/view-cache";
import { peekAuthState, resolveAuthState } from "../../../lib/auth-state";
import type { InterventionStatus, UserRole } from "@acme/shared";

type InterventionListResponse = z.infer<typeof interventionListResponseSchema>;
type ClientListResponse = z.infer<typeof clientListResponseSchema>;
type SettingsOverview = z.infer<typeof settingsOverviewSchema>;
type InterventionItem = InterventionListResponse["items"][number];
type CreateInterventionInput = z.infer<typeof createInterventionSchema>;

const viewModes = [
  { id: "board", label: "Board", icon: LayoutGrid },
  { id: "table", label: "Table", icon: List },
] as const;

const statusMeta: Record<
  InterventionStatus,
  { label: string; tone: string; columnTone: string }
> = {
  DRAFT: {
    label: "Draft",
    tone: "bg-slate-100 text-slate-700",
    columnTone: "border-slate-200 bg-slate-50",
  },
  SCHEDULED: {
    label: "Scheduled",
    tone: "bg-sky-100 text-sky-700",
    columnTone: "border-sky-200 bg-sky-50/70",
  },
  IN_PROGRESS: {
    label: "In progress",
    tone: "bg-amber-100 text-amber-700",
    columnTone: "border-amber-200 bg-amber-50/70",
  },
  ON_HOLD: {
    label: "On hold",
    tone: "bg-violet-100 text-violet-700",
    columnTone: "border-violet-200 bg-violet-50/70",
  },
  COMPLETED: {
    label: "Completed",
    tone: "bg-emerald-100 text-emerald-700",
    columnTone: "border-emerald-200 bg-emerald-50/70",
  },
  CANCELLED: {
    label: "Cancelled",
    tone: "bg-rose-100 text-rose-700",
    columnTone: "border-rose-200 bg-rose-50/70",
  },
};

export default function InterventionsPage() {
  const [data, setData] = useState<InterventionListResponse | null>(() => readViewCache<InterventionListResponse>("interventions"));
  const [clients, setClients] = useState<ClientListResponse | null>(() => readViewCache<ClientListResponse>("clients:options"));
  const [members, setMembers] = useState<SettingsOverview["members"]>(() => readViewCache<SettingsOverview["members"]>("workspace:members") ?? []);
  const [role, setRole] = useState<UserRole | null>(() => peekAuthState()?.role ?? null);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editIntervention, setEditIntervention] = useState<InterventionItem | null>(null);
  const [viewMode, setViewMode] = useState<(typeof viewModes)[number]["id"]>("board");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropStatus, setDropStatus] = useState<InterventionStatus | null>(null);

  const load = async () => {
    try {
      const api = createAuthedApi(getAccessToken);
      const authState = await resolveAuthState();
      setRole(authState.role);

      const interventionsResult = await api.request(apiContracts.interventions, {
        query: { page: 1, pageSize: 50, sortBy: "scheduledAt", sortOrder: "asc" },
      });

      if (authState.role === "USER") {
        setData(interventionsResult);
        setClients(null);
        setMembers([]);
        writeViewCache("interventions", interventionsResult);
        setError(null);
        return;
      }

      const [clientsResult, settingsOverview] = await Promise.all([
        api.request(clientContracts.list, {
          query: { page: 1, pageSize: 100, sortBy: "createdAt", sortOrder: "desc" },
        }),
        api.request(settingsContracts.overview, {}),
      ]);

      setData(interventionsResult);
      setClients(clientsResult);
      setMembers(settingsOverview.members);
      writeViewCache("interventions", interventionsResult);
      writeViewCache("clients:options", clientsResult);
      writeViewCache("workspace:members", settingsOverview.members);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load interventions");
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const memberLookup = useMemo(
    () =>
      new Map(
        members.map((member) => [
          member.userId,
          {
            name: member.fullName,
            role: member.role,
          },
        ]),
      ),
    [members],
  );

  const groupedItems = useMemo(
    () =>
      interventionStatuses.reduce<Record<InterventionStatus, InterventionItem[]>>((accumulator, status) => {
        accumulator[status] = (data?.items ?? []).filter((item) => item.status === status);
        return accumulator;
      }, {} as Record<InterventionStatus, InterventionItem[]>),
    [data],
  );

  const createIntervention = async (values: CreateInterventionInput) => {
    const api = createAuthedApi(getAccessToken);
    await api.request(interventionContracts.create, {
      body: values,
    });
    await load();
    setCreateOpen(false);
  };

  const updateIntervention = async (values: CreateInterventionInput) => {
    if (!editIntervention) return;
    const api = createAuthedApi(getAccessToken);
    await api.request(interventionContracts.update, {
      pathParams: { id: editIntervention.id },
      body: values,
    });
    await load();
    setEditIntervention(null);
  };

  const updateInterventionStatus = async (interventionId: string, status: InterventionStatus) => {
    const current = data?.items.find((item) => item.id === interventionId);
    if (!current || current.status === status) {
      return;
    }

    if (!canTransitionInterventionStatus(current.status, status)) {
      throw new Error(`Interventions cannot move from ${current.status} to ${status}.`);
    }

    const api = createAuthedApi(getAccessToken);
    await api.request(interventionContracts.updateStatus, {
      pathParams: { id: interventionId },
      body: { status },
    });
    await load();
  };

  const removeIntervention = async (id: string) => {
    const confirmed = window.confirm("Delete this intervention and every linked note, attachment, and invoice?");
    if (!confirmed) return;

    const api = createAuthedApi(getAccessToken);
    await api.request(interventionContracts.remove, {
      pathParams: { id },
    });
    await load();
  };

  const renderActionButtons = (item: InterventionItem) => (
    <div key={`${item.id}-actions`} className="flex flex-wrap gap-2">
      <Link
        href={`/interventions/${item.id}`}
        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
      >
        <Eye className="h-4 w-4" />
        View
      </Link>
      {role !== "USER" ? (
        <>
          <button
            type="button"
            onClick={() => setEditIntervention(item)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
          >
            <Pencil className="h-4 w-4" />
            Edit
          </button>
          <button
            type="button"
            onClick={() => removeIntervention(item.id)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </>
      ) : null}
    </div>
  );

  if (error) {
    return <StateCard title="Unable to load interventions" description={error} />;
  }

  if (!data) {
    return <StateCard title="Loading interventions" description="Fetching interventions from the API layer." />;
  }

  return (
    <div className="space-y-4">
      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_12px_40px_rgba(15,23,42,0.05)] sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Interventions</h2>
            <p className="mt-1 text-sm text-slate-500">
              {data.total} job records across every active workflow state.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="inline-flex items-center rounded-2xl border border-slate-200 bg-slate-50 p-1">
              {viewModes.map((mode) => {
                const Icon = mode.icon;
                const active = viewMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setViewMode(mode.id)}
                    className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition ${
                      active ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-950"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {mode.label}
                  </button>
                );
              })}
            </div>
            {role !== "USER" ? (
              <button
                onClick={() => setCreateOpen(true)}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white"
              >
                <Plus className="h-4 w-4" />
                New intervention
              </button>
            ) : null}
          </div>
        </div>
      </section>

      {viewMode === "board" ? (
        <section className="grid gap-4 xl:grid-cols-3 2xl:grid-cols-6">
          {interventionStatuses.map((status) => {
            const items = groupedItems[status];
            const meta = statusMeta[status];
            const isDropTarget = dropStatus === status;
            const draggingItem = draggingId ? data.items.find((item) => item.id === draggingId) : null;
            const canDropHere = draggingItem
              ? draggingItem.status !== status &&
                canTransitionInterventionStatus(draggingItem.status, status)
              : true;

            return (
              <article
                key={status}
                onDragOver={(event) => {
                  if (role === "USER") return;
                  if (!canDropHere) return;
                  event.preventDefault();
                  setDropStatus(status);
                }}
                onDragLeave={() => setDropStatus((current) => (current === status ? null : current))}
                onDrop={async () => {
                  if (!draggingId) return;
                  if (!canDropHere) {
                    setDraggingId(null);
                    setDropStatus(null);
                    return;
                  }
                  try {
                    await updateInterventionStatus(draggingId, status);
                  } finally {
                    setDraggingId(null);
                    setDropStatus(null);
                  }
                }}
                className={`rounded-[28px] border p-4 shadow-[0_12px_40px_rgba(15,23,42,0.04)] transition ${meta.columnTone} ${
                  isDropTarget ? "ring-2 ring-sky-400 ring-offset-2" : ""
                } ${
                  draggingItem && !canDropHere ? "opacity-60" : ""
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">{meta.label}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400">{items.length} items</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${meta.tone}`}>{items.length}</span>
                </div>
                <div className="mt-4 space-y-3">
                  {items.length ? (
                    items.map((item) => {
                      const member = item.assignedTechnicianId ? memberLookup.get(item.assignedTechnicianId) : null;
                      return (
                        <div
                          key={item.id}
                          draggable={role !== "USER"}
                          onDragStart={() => setDraggingId(item.id)}
                          onDragEnd={() => {
                            setDraggingId(null);
                            setDropStatus(null);
                          }}
                          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <Link
                                href={`/interventions/${item.id}`}
                                className="font-medium text-slate-950 underline-offset-4 hover:underline"
                              >
                                {item.title}
                              </Link>
                              <p className="mt-1 text-sm text-slate-500">
                                {item.scheduledAt ? new Date(item.scheduledAt).toLocaleString() : "Not scheduled"}
                              </p>
                            </div>
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                              {item.priority}
                            </span>
                          </div>
                          <div className="mt-4 grid gap-2 text-sm text-slate-600">
                            <div className="flex items-center justify-between gap-3">
                              <span>Assignee</span>
                              <span className="font-medium text-slate-800">
                                {member ? member.name : "Unassigned"}
                              </span>
                            </div>
                            {member?.role ? (
                              <div className="flex items-center justify-between gap-3">
                                <span>Role</span>
                                <span className="text-xs uppercase tracking-[0.2em] text-slate-400">{member.role}</span>
                              </div>
                            ) : null}
                          </div>
                          <div className="mt-4 flex flex-wrap gap-2">{renderActionButtons(item)}</div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 px-4 py-6 text-center text-sm text-slate-400">
                      No interventions in this state.
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        /* Previous mobile-friendly intervention card rendering is intentionally kept in the board view above.
           For table mode on mobile, we now use a denser list row treatment instead. */
        <DataTable
          title="Jobs"
          subtitle={`${data.total} intervention records returned`}
          mobileContent={
            <div className="divide-y divide-slate-200">
              {data.items.map((item) => (
                <article key={item.id} className="flex items-start justify-between gap-3 px-4 py-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-950">{item.title}</p>
                    <p className="mt-1 truncate text-sm text-slate-500">{statusMeta[item.status].label}</p>
                  </div>
                  <MobileKebabMenu
                    items={[
                      { label: "View", href: `/interventions/${item.id}` },
                      ...(role !== "USER"
                        ? [
                            { label: "Edit", onClick: () => setEditIntervention(item) },
                            { label: "Delete", onClick: () => void removeIntervention(item.id), tone: "danger" as const },
                          ]
                        : []),
                    ]}
                  />
                </article>
              ))}
            </div>
          }
          columns={["Title", "Status", "Priority", "Scheduled", "Assignee", "Actions"]}
          rows={data.items.map((item) => [
            <Link key={item.id} href={`/interventions/${item.id}`} className="font-medium text-slate-950 underline-offset-4 hover:underline">
              {item.title}
            </Link>,
            statusMeta[item.status].label,
            item.priority,
            item.scheduledAt ? new Date(item.scheduledAt).toLocaleString() : "Not scheduled",
            item.assignedTechnicianId ? memberLookup.get(item.assignedTechnicianId)?.name ?? "Assigned" : "Unassigned",
            renderActionButtons(item),
          ])}
        />
      )}

      {role !== "USER" ? (
        <>
          <Modal
            open={createOpen}
            onClose={() => setCreateOpen(false)}
            title="Create intervention"
            description="Schedule a new job and assign the operational details."
          >
            {clients ? (
              <InterventionForm
                clientOptions={clients.items.map((client) => ({
                  id: client.id,
                  name: client.name,
                  address: client.address,
                }))}
                memberOptions={members.map((member) => ({
                  id: member.userId,
                  name: member.fullName,
                  role: member.role,
                }))}
                onSubmitIntervention={createIntervention}
              />
            ) : null}
          </Modal>
          <Modal
            open={Boolean(editIntervention)}
            onClose={() => setEditIntervention(null)}
            title="Edit intervention"
            description="Update scheduling, assignment, and job details."
          >
            {clients && editIntervention ? (
              <InterventionForm
                clientOptions={clients.items.map((client) => ({
                  id: client.id,
                  name: client.name,
                  address: client.address,
                }))}
                memberOptions={members.map((member) => ({
                  id: member.userId,
                  name: member.fullName,
                  role: member.role,
                }))}
                initialValues={{
                  clientId: editIntervention.clientId,
                  assignedTechnicianId: editIntervention.assignedTechnicianId ?? null,
                  title: editIntervention.title,
                  description: editIntervention.description ?? "",
                  status: editIntervention.status,
                  priority: editIntervention.priority,
                  scheduledAt: editIntervention.scheduledAt ?? null,
                  dueDate: editIntervention.dueDate ?? null,
                  location: editIntervention.location ?? "",
                  notes: editIntervention.notes ?? "",
                }}
                submitLabel="Save changes"
                onSubmitIntervention={updateIntervention}
              />
            ) : null}
          </Modal>
        </>
      ) : null}
    </div>
  );
}
