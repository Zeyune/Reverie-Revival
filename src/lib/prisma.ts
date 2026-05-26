import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  pool?: Pool;
};

const datasourceUrl = process.env.DATABASE_URL;

export const prisma =
  datasourceUrl === undefined
    ? undefined
    : globalForPrisma.prisma ??
      (() => {
        const pool = globalForPrisma.pool ?? new Pool({ connectionString: datasourceUrl });
        const adapter = new PrismaPg(pool);
        const client = new PrismaClient({ adapter });

        if (process.env.NODE_ENV !== "production") {
          globalForPrisma.pool = pool;
        }

        return client;
      })();

if (prisma && process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export type { PrismaClient } from "@/generated/prisma/client";
