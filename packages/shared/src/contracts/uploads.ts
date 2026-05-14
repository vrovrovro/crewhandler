import { z } from "zod";
import { defineContract } from "./http";

export const createSignedUploadSchema = z.object({
  bucket: z.literal("job-attachments"),
  interventionId: z.string(),
  fileName: z.string().min(1).max(255),
  contentType: z.string().min(1).max(120),
});

export const signedUploadResponseSchema = z.object({
  path: z.string(),
  token: z.string(),
  fileUrl: z.string().url(),
});

export const uploadContracts = {
  createSignedUrl: defineContract({
    method: "POST",
    path: "/uploads/signed-url",
    body: createSignedUploadSchema,
    response: signedUploadResponseSchema,
    auth: true,
  }),
} as const;
