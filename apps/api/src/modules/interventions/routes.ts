import type { FastifyInstance } from "fastify";
import { createSupabaseAdmin } from "@acme/db";
import { canTransitionInterventionStatus, interventionContracts } from "@acme/shared";
import { requirePermission } from "../../lib/auth";

const admin = createSupabaseAdmin();
const ATTACHMENT_BUCKET = "job-attachments";
const getStoragePath = (storedReference: string) => {
  if (!storedReference.startsWith("http://") && !storedReference.startsWith("https://")) {
    return storedReference;
  }

  const marker = `/object/public/${ATTACHMENT_BUCKET}/`;
  const markerIndex = storedReference.indexOf(marker);
  if (markerIndex >= 0) {
    return storedReference.slice(markerIndex + marker.length);
  }

  return null;
};

const serializeIntervention = (item: Record<string, unknown>) => ({
  id: String(item.id),
  organizationId: String(item.organization_id),
  clientId: String(item.client_id),
  assignedTechnicianId: (item.assigned_technician_id as string | null) ?? null,
  title: String(item.title),
  description: (item.description as string | null) ?? null,
  status: item.status,
  priority: item.priority,
  scheduledAt: (item.scheduled_at as string | null) ?? null,
  dueDate: (item.due_date as string | null) ?? null,
  location: (item.location as string | null) ?? null,
  notes: (item.notes as string | null) ?? null,
  createdAt: String(item.created_at),
  updatedAt: String(item.updated_at),
  completedAt: (item.completed_at as string | null) ?? null,
});

export const registerInterventionRoutes = async (app: FastifyInstance) => {
  app.get(
    "/interventions/:id",
    { preHandler: [app.authenticate, requirePermission("interventions:read")] },
    async (request, reply) => {
      const id = (request.params as { id: string }).id;
      const { data: intervention, error } = await admin
        .from("interventions")
        .select("*")
        .eq("id", id)
        .eq("organization_id", request.user.organizationId)
        .single();

      if (error || !intervention) {
        return reply.notFound("Intervention not found");
      }

      const [{ data: notes }, { data: attachments }] = await Promise.all([
        admin.from("job_notes").select("*").eq("intervention_id", id).order("created_at", { ascending: false }),
        admin.from("job_attachments").select("*").eq("intervention_id", id).order("created_at", { ascending: false }),
      ]);

      const hydratedAttachments = await Promise.all(
        (attachments ?? []).map(async (attachment) => {
          const storedReference = String(attachment.file_url);
          const storagePath = getStoragePath(storedReference);

          if (!storagePath) {
            return {
              id: String(attachment.id),
              interventionId: String(attachment.intervention_id),
              uploaderId: String(attachment.uploader_id),
              kind: attachment.kind,
              fileName: String(attachment.file_name),
              fileUrl: storedReference,
              createdAt: String(attachment.created_at),
            };
          }

          const { data: signedData } = await admin.storage
            .from(ATTACHMENT_BUCKET)
            .createSignedUrl(storagePath, 60 * 60);

          return {
            id: String(attachment.id),
            interventionId: String(attachment.intervention_id),
            uploaderId: String(attachment.uploader_id),
            kind: attachment.kind,
            fileName: String(attachment.file_name),
            fileUrl: signedData?.signedUrl ?? storedReference,
            createdAt: String(attachment.created_at),
          };
        }),
      );

      return interventionContracts.detail.response.parse({
        intervention: serializeIntervention(intervention),
        notes: (notes ?? []).map((note) => ({
          id: String(note.id),
          interventionId: String(note.intervention_id),
          authorId: String(note.author_id),
          content: String(note.content),
          createdAt: String(note.created_at),
        })),
        attachments: hydratedAttachments,
      });
    },
  );

  app.get(
    interventionContracts.list.path,
    { preHandler: [app.authenticate, requirePermission("interventions:read")] },
    async (request) => {
      const query = interventionContracts.list.query.parse(request.query);
      const from = (query.page - 1) * query.pageSize;
      const to = from + query.pageSize - 1;

      let supabaseQuery = admin
        .from("interventions")
        .select("*", { count: "exact" })
        .eq("organization_id", request.user.organizationId)
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

      if (request.user.role === "USER") {
        supabaseQuery = supabaseQuery.eq("assigned_technician_id", request.user.id);
      }
      if (query.search) supabaseQuery = supabaseQuery.ilike("title", `%${query.search}%`);
      if (query.status) supabaseQuery = supabaseQuery.eq("status", query.status);
      if (query.priority) supabaseQuery = supabaseQuery.eq("priority", query.priority);
      if (query.assignedTechnicianId) {
        supabaseQuery = supabaseQuery.eq("assigned_technician_id", query.assignedTechnicianId);
      }

      const { data, count, error } = await supabaseQuery;
      if (error) throw error;

      return interventionContracts.list.response.parse({
        items: (data ?? []).map(serializeIntervention),
        total: count ?? 0,
        page: query.page,
        pageSize: query.pageSize,
      });
    },
  );

  app.post(
    interventionContracts.create.path,
    { preHandler: [app.authenticate, requirePermission("interventions:create")] },
    async (request) => {
      const payload = interventionContracts.create.body.parse(request.body);
      const { data, error } = await admin
        .from("interventions")
        .insert({
          organization_id: request.user.organizationId,
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

      if (error) throw error;
      return interventionContracts.create.response.parse(serializeIntervention(data));
    },
  );

  app.patch(
    "/interventions/:id",
    { preHandler: [app.authenticate, requirePermission("interventions:update")] },
    async (request, reply) => {
      const payload = interventionContracts.update.body.parse(request.body);
      const id = (request.params as { id: string }).id;
      const { data, error } = await admin
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
        .eq("organization_id", request.user.organizationId)
        .select("*")
        .single();

      if (error) return reply.notFound("Intervention not found");
      return interventionContracts.update.response.parse(serializeIntervention(data));
    },
  );

  app.patch(
    "/interventions/:id/status",
    { preHandler: [app.authenticate, requirePermission("interventions:updateStatus")] },
    async (request, reply) => {
      const payload = interventionContracts.updateStatus.body.parse(request.body);
      const id = (request.params as { id: string }).id;

      const { data: existing, error: existingError } = await admin
        .from("interventions")
        .select("*")
        .eq("id", id)
        .eq("organization_id", request.user.organizationId)
        .single();

      if (existingError || !existing) {
        return reply.notFound("Intervention not found");
      }

      if (!canTransitionInterventionStatus(existing.status, payload.status)) {
        return reply.badRequest("Invalid status transition");
      }

      const { data, error } = await admin
        .from("interventions")
        .update({
          status: payload.status,
          completed_at: payload.status === "COMPLETED" ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("organization_id", request.user.organizationId)
        .select("*")
        .single();

      if (error) throw error;

      if (payload.note) {
        await admin.from("job_notes").insert({
          intervention_id: id,
          author_id: request.user.id,
          content: payload.note,
        });
      }

      return interventionContracts.updateStatus.response.parse(serializeIntervention(data));
    },
  );

  app.post(
    "/interventions/:id/notes",
    { preHandler: [app.authenticate, requirePermission("interventions:updateStatus")] },
    async (request) => {
      const id = (request.params as { id: string }).id;
      const payload = interventionContracts.addNote.body.parse({
        ...(request.body as object),
        interventionId: id,
      });

      const { data, error } = await admin
        .from("job_notes")
        .insert({
          intervention_id: payload.interventionId,
          author_id: request.user.id,
          content: payload.content,
        })
        .select("*")
        .single();

      if (error) throw error;

      return interventionContracts.addNote.response.parse({
        id: String(data.id),
        interventionId: String(data.intervention_id),
        authorId: String(data.author_id),
        content: String(data.content),
        createdAt: String(data.created_at),
      });
    },
  );

  app.post(
    "/interventions/:id/attachments",
    { preHandler: [app.authenticate, requirePermission("attachments:create")] },
    async (request) => {
      const id = (request.params as { id: string }).id;
      const payload = interventionContracts.addAttachment.body.parse({
        ...(request.body as object),
        interventionId: id,
      });

      const { data, error } = await admin
        .from("job_attachments")
        .insert({
          intervention_id: payload.interventionId,
          uploader_id: request.user.id,
          kind: payload.kind,
          file_name: payload.fileName,
          file_url: payload.fileUrl,
        })
        .select("*")
        .single();

      if (error) throw error;

      return interventionContracts.addAttachment.response.parse({
        id: String(data.id),
        interventionId: String(data.intervention_id),
        uploaderId: String(data.uploader_id),
        kind: data.kind,
        fileName: String(data.file_name),
        fileUrl: String(data.file_url),
        createdAt: String(data.created_at),
      });
    },
  );

  app.delete(
    "/interventions/:id/attachments/:attachmentId",
    { preHandler: [app.authenticate, requirePermission("attachments:create")] },
    async (request, reply) => {
      const { id, attachmentId } = request.params as { id: string; attachmentId: string };

      const { data: attachment, error: attachmentError } = await admin
        .from("job_attachments")
        .select("*")
        .eq("id", attachmentId)
        .eq("intervention_id", id)
        .single();

      if (attachmentError || !attachment) {
        return reply.notFound("Attachment not found");
      }

      const storedReference = String(attachment.file_url);
      const storagePath = getStoragePath(storedReference);
      if (storagePath) {
        await admin.storage.from(ATTACHMENT_BUCKET).remove([storagePath]);
      }

      const { error: deleteError } = await admin
        .from("job_attachments")
        .delete()
        .eq("id", attachmentId)
        .eq("intervention_id", id);

      if (deleteError) throw deleteError;

      return interventionContracts.deleteAttachment.response.parse({
        id: String(attachment.id),
        interventionId: String(attachment.intervention_id),
        uploaderId: String(attachment.uploader_id),
        kind: attachment.kind,
        fileName: String(attachment.file_name),
        fileUrl: storedReference,
        createdAt: String(attachment.created_at),
      });
    },
  );

  app.delete(
    "/interventions/:id",
    { preHandler: [app.authenticate, requirePermission("interventions:delete")] },
    async (request, reply) => {
      const id = (request.params as { id: string }).id;

      const { data, error } = await admin
        .from("interventions")
        .delete()
        .eq("id", id)
        .eq("organization_id", request.user.organizationId)
        .select("*")
        .single();

      if (error || !data) {
        return reply.notFound("Intervention not found");
      }

      return interventionContracts.remove.response.parse(serializeIntervention(data));
    },
  );
};
