import { validateEnv } from "@/server/env";
import { startAllWorkers } from "./index";
import { logger } from "@/server/logger";

validateEnv();

logger.info("Lead Reach AI Worker Supervisor starting...");
const workers = startAllWorkers();

const shutdown = async (signal: string) => {
  logger.info({ signal }, "Shutting down Lead Reach AI workers gracefully...");
  await Promise.allSettled(Object.values(workers).map((w) => w.close()));
  logger.info("All workers stopped. Exiting process.");
  process.exit(0);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
