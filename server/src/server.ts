import { createServer } from "node:http";
import { app } from "./app.js";
import { connectDatabase, disconnectDatabase } from "./config/database.js";
import { env } from "./config/env.js";
import { connectRedis, disconnectRedis } from "./config/redis.js";

async function startServer(): Promise<void> {
  try {
    await connectDatabase();
    await connectRedis();
  } catch (error) {
    await Promise.allSettled([disconnectDatabase(), disconnectRedis()]);
    throw error;
  }

  const server = createServer(app);
  server.listen(env.port, () => {
    console.info(`API listening on port ${env.port}`);
  });

  let isShuttingDown = false;
  const shutdown = () => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    server.close(async (error) => {
      if (error) {
        console.error("HTTP server shutdown failed.");
        process.exitCode = 1;
      }
      try {
        await Promise.all([disconnectDatabase(), disconnectRedis()]);
      } catch {
        console.error("A dependency did not close cleanly.");
        process.exitCode = 1;
      }
    });
  };

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

startServer().catch((error: unknown) => {
  const errorName = error instanceof Error ? error.name : "UnknownError";
  console.error(`API startup failed (${errorName}). Check dependency availability and server configuration.`);
  process.exitCode = 1;
});
