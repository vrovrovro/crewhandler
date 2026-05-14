import fp from "fastify-plugin";
import { ZodError } from "zod";

export const errorHandlerPlugin = fp(async (app) => {
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      return reply.status(400).send({
        message: "Validation failed",
        issues: error.flatten(),
      });
    }

    app.log.error(error);
    return reply.status(error.statusCode ?? 500).send({
      message: error.message || "Internal server error",
    });
  });
});
