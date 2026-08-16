import { PrismaClient } from "@prisma/client";

// Bump key when Prisma schema changes so dev HMR doesn't keep a stale client.
const PRISMA_CLIENT_KEY = "prisma_v11";

const globalForPrisma = globalThis as unknown as Record<string, PrismaClient | undefined>;

export const prisma = globalForPrisma[PRISMA_CLIENT_KEY] ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma[PRISMA_CLIENT_KEY] = prisma;
}
