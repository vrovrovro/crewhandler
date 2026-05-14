import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  WEB_APP_URL: z.string().url(),
  EXPO_PUBLIC_API_URL: z.string().url().optional(),
  PORT: z.coerce.number().default(4000),
});

export const env = envSchema.parse(process.env);
