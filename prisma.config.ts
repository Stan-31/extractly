import { config } from "dotenv";
import { defineConfig } from "prisma/config";

config({ path: ".env.local" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Migrate needs a direct (non-transaction-pooled) connection; the app's
    // runtime PrismaClient uses DATABASE_URL (pooled) via lib/prisma.ts instead.
    url: process.env["DIRECT_URL"],
  },
});
