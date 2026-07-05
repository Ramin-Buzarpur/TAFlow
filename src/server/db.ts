import "server-only";
import { PrismaClient } from "@prisma/client";
import { getValidatedEnv } from "@/env";

getValidatedEnv();

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development" && process.env.TAFLOW_E2E !== "1"
        ? ["query", "error", "warn"]
        : ["error"]
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
