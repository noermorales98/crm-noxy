import { PrismaClient } from "@prisma/client";

// Bump key when Prisma schema changes so dev HMR doesn't keep a stale client.
const globalForPrisma = globalThis as unknown as {
  prisma_v5: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma_v5 ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma_v5 = prisma;

