import type { FastifyInstance } from "fastify";
import { createSupabaseAdmin } from "@acme/db";
import { uploadContracts } from "@acme/shared";
import { requirePermission } from "../../lib/auth";

const admin = createSupabaseAdmin();

export const registerUploadRoutes = async (app: FastifyInstance) => {
  app.post(
    uploadContracts.createSignedUrl.path,
    { preHandler: [app.authenticate, requirePermission("attachments:create")] },
    async (request) => {
      const payload = uploadContracts.createSignedUrl.body.parse(request.body);
      const path = `${request.user.organizationId}/${payload.interventionId}/${Date.now()}-${payload.fileName.replace(/\s+/g, "-")}`;

      const { data, error } = await admin.storage
        .from(payload.bucket)
        .createSignedUploadUrl(path);

      if (error) throw error;

      const { data: publicData } = admin.storage.from(payload.bucket).getPublicUrl(path);

      return uploadContracts.createSignedUrl.response.parse({
        path,
        token: data.token,
        fileUrl: publicData.publicUrl,
      });
    },
  );
};
