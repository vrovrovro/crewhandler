import { buildServer } from "./server";
import { env } from "./lib/env";

const start = async () => {
  const app = await buildServer();
  await app.listen({ port: env.PORT, host: "0.0.0.0" });
};

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
