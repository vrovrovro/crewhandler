"use client";

import { z } from "zod";
import {
  canTransitionInterventionStatus,
  createInterventionSchema,
  interventionContracts,
  interventionDetailSchema,
  interventionListResponseSchema,
  interventionSchema,
  type InterventionStatus,
} from "@acme/shared";
import { supabaseBrowser } from "./supabase-browser";
import { getActiveWorkspaceContext } from "./supabase-workspace";
import { createAuthedApi } from "./api";
import { getAccessToken } from "./session-client";

type Intervention = z.infer<typeof interventionSchema>;
type InterventionDetailResponse = z.infer<typeof interventionDetailSchema>;
type InterventionListResponse = z.infer<typeof interventionListResponseSchema>;
type CreateInterventionInput = z.infer<typeof createInterventionSchema>;

const ADMIN_ROLES = new Set(["OWNER", "ADMIN"]);

const mapIntervention = (item: Record<string, unknown>): Intervention =>
  interventionSchema.parse({
    id: String(item.id),
    organizationId: String(item.organization_id),
    clientId: String(item.client_id),
    assignedTechnicianId:
      item.assigned_technician_id == null ? null : String(item.assigned_technician_id),
    title: String(item.title),
    description: item.description == null ? null : String(item.description),
    status: item.status,
    priority: item.priority,
    scheduledAt: item.scheduled_at == null ? null : String(item.scheduled_at),
    dueDate: item.due_date == null ? null : String(item.due_date),
    location: item.location == null ? null : String(item.location),
    notes: item.notes == null ? null : String(item.notes),
    createdAt: String(item.created_at),
    updatedAt: String(item.updated_at),
    completedAt: item.completed_at == null ? null : String(item.completed_at),
  });

const ensureWorkspaceAdmin = async () => {
  const context = await getActiveWorkspaceContext();

  if (!ADMIN_ROLES.has(context.role)) {
    throw new Error("You do not have permission to manage interventions in this workspace.");
  }

  return context;
};

const listInterventionsViaApi = async (query: {
  page: number;
  pageSize: number;
  sortBy: "scheduledAt" | "dueDate" | "createdAt" | "priority";
  sortOrder: "asc" | "desc";
  search?: string;
  status?: Intervention["status"];
  priority?: Intervention["priority"];
  assignedTechnicianId?: string;
}): Promise<InterventionListResponse> => {
  const api = createAuthedApi(getAccessToken);
  return api.request(interventionContracts.list, { query });
};

const getInterventionDetailViaApi = async (id: string): Promise<InterventionDetailResponse> => {
  const api = createAuthedApi(getAccessToken);
  return api.request(interventionContracts.detail, {
    pathParams: { id },
  });
};

export const listInterventionsDirect = async (query: {
  page: number;
  pageSize: number;
  sortBy: "scheduledAt" | "dueDate" | "createdAt" | "priority";
  sortOrder: "asc" | "desc";
  search?: string;
  status?: Intervention["status"];
  priority?: Intervention["priority"];
  assignedTechnicianId?: string;
}): Promise<InterventionListResponse> => {
  const context = await getActiveWorkspaceContext();
  const from = (query.page - 1) * query.pageSize;
  const to = from + query.pageSize - 1;

  let supabaseQuery = supabaseBrowser
    .from("interventions")
    .select("*", { count: "exact" })
    .eq("organization_id", context.organizationId)
    .order(
      query.sortBy === "scheduledAt"
        ? "scheduled_at"
        : query.sortBy === "dueDate"
          ? "due_date"
          : query.sortBy === "createdAt"
            ? "created_at"
            : "priority",
      { ascending: query.sortOrder === "asc", nullsFirst: false },
    )
    .range(from, to);

  if (context.role === "USER") {
    supabaseQuery = supabaseQuery.eq("assigned_technician_id", context.userId);
  }

  if (query.search) {
    supabaseQuery = supabaseQuery.ilike("title", `%${query.search}%`);
  }
  if (query.status) {
    supabaseQuery = supabaseQuery.eq("status", query.status);
  }
  if (query.priority) {
    supabaseQuery = supabaseQuery.eq("priority", query.priority);
  }
  if (query.assignedTechnicianId) {
    supabaseQuery = supabaseQuery.eq("assigned_technician_id", query.assignedTechnicianId);
  }

  const { data, count, error } = await supabaseQuery;
  if (error) {
    throw new Error(error.message);
  }

  if ((count ?? 0) === 0) {
    return listInterventionsViaApi(query);
  }

  return interventionListResponseSchema.parse({
    items: (data ?? []).map((item) => mapIntervention(item as Record<string, unknown>)),
    total: count ?? 0,
    page: query.page,
    pageSize: query.pageSize,
  });
};

export const createInterventionDirect = async (values: CreateInterventionInput): Promise<Intervention> => {
  const context = await ensureWorkspaceAdmin();
  const payload = createInterventionSchema.parse(values);
  const { data, error } = await supabaseBrowser
    .from("interventions")
    .insert({
      organization_id: context.organizationId,
      client_id: payload.clientId,
      assigned_technician_id: payload.assignedTechnicianId ?? null,
      title: payload.title,
      description: payload.description ?? null,
      status: payload.status,
      priority: payload.priority,
      scheduled_at: payload.scheduledAt ?? null,
      due_date: payload.dueDate ?? null,
      location: payload.location ?? null,
      notes: payload.notes ?? null,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to create intervention");
  }

  return mapIntervention(data as Record<string, unknown>);
};

export const updateInterventionDirect = async (
  id: string,
  values: Partial<CreateInterventionInput>,
): Promise<Intervention> => {
  await ensureWorkspaceAdmin();
  const payload = createInterventionSchema.partial().parse(values);
  const { data, error } = await supabaseBrowser
    .from("interventions")
    .update({
      ...(payload.clientId !== undefined ? { client_id: payload.clientId } : {}),
      ...(payload.assignedTechnicianId !== undefined
        ? { assigned_technician_id: payload.assignedTechnicianId }
        : {}),
      ...(payload.title !== undefined ? { title: payload.title } : {}),
      ...(payload.description !== undefined ? { description: payload.description } : {}),
      ...(payload.status !== undefined ? { status: payload.status } : {}),
      ...(payload.priority !== undefined ? { priority: payload.priority } : {}),
      ...(payload.scheduledAt !== undefined ? { scheduled_at: payload.scheduledAt } : {}),
      ...(payload.dueDate !== undefined ? { due_date: payload.dueDate } : {}),
      ...(payload.location !== undefined ? { location: payload.location } : {}),
      ...(payload.notes !== undefined ? { notes: payload.notes } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to update intervention");
  }

  return mapIntervention(data as Record<string, unknown>);
};

export const updateInterventionStatusDirect = async (
  id: string,
  currentStatus: Intervention["status"],
  nextStatus: InterventionStatus,
): Promise<Intervention> => {
  await ensureWorkspaceAdmin();

  if (!canTransitionInterventionStatus(currentStatus, nextStatus)) {
    throw new Error(`Interventions cannot move from ${currentStatus} to ${nextStatus}.`);
  }

  const { data, error } = await supabaseBrowser
    .from("interventions")
    .update({
      status: nextStatus,
      completed_at: nextStatus === "COMPLETED" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to update intervention status");
  }

  return mapIntervention(data as Record<string, unknown>);
};

export const deleteInterventionDirect = async (id: string): Promise<Intervention> => {
  await ensureWorkspaceAdmin();
  const { data, error } = await supabaseBrowser
    .from("interventions")
    .delete()
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to delete intervention");
  }

  return mapIntervention(data as Record<string, unknown>);
};

const mapJobNote = (note: Record<string, unknown>) => ({
  id: String(note.id),
  interventionId: String(note.intervention_id),
  authorId: String(note.author_id),
  content: String(note.content),
  createdAt: String(note.created_at),
});

const mapJobAttachment = async (attachment: Record<string, unknown>) => {
  const storedReference = String(attachment.file_url);
  let fileUrl = storedReference;
  let resolved = storedReference.startsWith("http://") || storedReference.startsWith("https://");

  if (!resolved) {
    const { data: signed, error: signedError } = await supabaseBrowser.storage
      .from("job-attachments")
      .createSignedUrl(storedReference, 60 * 60);

    if (!signedError && signed?.signedUrl) {
      fileUrl = signed.signedUrl;
      resolved = true;
    }
  }

  return {
    id: String(attachment.id),
    interventionId: String(attachment.intervention_id),
    uploaderId: String(attachment.uploader_id),
    kind: attachment.kind,
    fileName: String(attachment.file_name),
    fileUrl,
    createdAt: String(attachment.created_at),
    resolved,
  };
};

export const getInterventionDetailDirect = async (id: string): Promise<InterventionDetailResponse> => {
  const context = await getActiveWorkspaceContext();

  const [{ data: intervention, error: interventionError }, { data: notes, error: notesError }, { data: attachments, error: attachmentsError }] =
    await Promise.all([
      supabaseBrowser
        .from("interventions")
        .select("*")
        .eq("id", id)
        .eq("organization_id", context.organizationId)
        .single(),
      supabaseBrowser
        .from("job_notes")
        .select("*")
        .eq("intervention_id", id)
        .order("created_at", { ascending: false }),
      supabaseBrowser
        .from("job_attachments")
        .select("*")
        .eq("intervention_id", id)
        .order("created_at", { ascending: false }),
    ]);

  if (interventionError || !intervention) {
    throw new Error(interventionError?.message ?? "Intervention not found");
  }

  if (notesError || attachmentsError) {
    return getInterventionDetailViaApi(id);
  }

  const hydratedAttachments = await Promise.all(
    (attachments ?? []).map((attachment) => mapJobAttachment(attachment as Record<string, unknown>)),
  );

  if (
    (notes?.length ?? 0) === 0 && (attachments?.length ?? 0) === 0
  ) {
    return getInterventionDetailViaApi(id);
  }

  if (hydratedAttachments.some((attachment) => !attachment.resolved)) {
    return getInterventionDetailViaApi(id);
  }

  return interventionDetailSchema.parse({
    intervention: mapIntervention(intervention as Record<string, unknown>),
    notes: (notes ?? []).map((note) => mapJobNote(note as Record<string, unknown>)),
    attachments: hydratedAttachments.map(({ resolved: _resolved, ...attachment }) => attachment),
  });
};
