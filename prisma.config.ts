import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // `prisma generate` does not need a live DB; fall back to a dummy URL so builds work without one.
    url: process.env.DATABASE_URL ?? "postgresql://autohub:autohub@localhost:5432/autohub",
  },
  migrations: {
    path: "prisma/migrations",
  },
});
