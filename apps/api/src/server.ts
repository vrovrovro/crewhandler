import Fastify from "fastify";
import cors from "@fastify/cors";
import sensible from "@fastify/sensible";
import { env } from "./lib/env.js";
import { loggerOptions } from "./lib/logger.js";
import { authPlugin } from "./plugins/auth.js";
import { errorHandlerPlugin } from "./plugins/error-handler.js";
import { registerAuthRoutes } from "./modules/auth/routes.js";
import { registerClientRoutes } from "./modules/clients/routes.js";
import { registerDashboardRoutes } from "./modules/dashboard/routes.js";
import { registerInterventionRoutes } from "./modules/interventions/routes.js";
import { registerInvoiceRoutes } from "./modules/invoices/routes.js";
import { registerUploadRoutes } from "./modules/uploads/routes.js";
import { registerSettingsRoutes } from "./modules/settings/routes.js";

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
