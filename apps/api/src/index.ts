import { buildServer } from "./server.js";
import { env } from "./lib/env.js";

const start = async () => {
  const app = await buildServer();
  await app.listen({ port: env.PORT, host: "0.0.0.0" });
};

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
