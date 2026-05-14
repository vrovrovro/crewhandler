import fp from "fastify-plugin";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { AuthUser } from "../lib/auth";
import { authenticateRequest } from "../lib/auth";

declare module "fastify" {
  interface FastifyRequest {
    user: AuthUser;
  }

  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export const authPlugin = fp(async (app) => {
  app.decorate("authenticate", async (request: FastifyRequest, reply: FastifyReply) => {
    await authenticateRequest(request, reply);
  });
});
