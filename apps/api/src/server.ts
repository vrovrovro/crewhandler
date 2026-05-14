import Fastify from "fastify";
import cors from "@fastify/cors";
import sensible from "@fastify/sensible";
import { env } from "./lib/env";
import { loggerOptions } from "./lib/logger";
import { authPlugin } from "./plugins/auth";
import { errorHandlerPlugin } from "./plugins/error-handler";
import { registerAuthRoutes } from "./modules/auth/routes";
import { registerClientRoutes } from "./modules/clients/routes";
import { registerDashboardRoutes } from "./modules/dashboard/routes";
import { registerInterventionRoutes } from "./modules/interventions/routes";
import { registerInvoiceRoutes } from "./modules/invoices/routes";
import { registerUploadRoutes } from "./modules/uploads/routes";
import { registerSettingsRoutes } from "./modules/settings/routes";

export const buildServer = async () => {
  const app = Fastify({ logger: loggerOptions });

  await app.register(cors, {
    origin: (origin, callback) => {
      const allowedOrigins = new Set([
        env.WEB_APP_URL,
        "http://localhost:3000",
        "http://127.0.0.1:3000",
      ]);

      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} is not allowed by CORS`), false);
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Authorization", "Content-Type"],
    maxAge: 86400,
  });
  await app.register(sensible);
  await app.register(authPlugin);
  await app.register(errorHandlerPlugin);

  app.get("/health", async () => ({ ok: true }));

  await registerAuthRoutes(app);
  await registerDashboardRoutes(app);
  await registerClientRoutes(app);
  await registerInterventionRoutes(app);
  await registerInvoiceRoutes(app);
  await registerUploadRoutes(app);
  await registerSettingsRoutes(app);

  return app;
};
