import { PrismaClient, Prisma } from "@prisma/client";
import {
  DbUnavailableError,
  dbUnavailableUserMessage,
  isDbUnavailableError,
} from "@/src/lib/db-errors";

export {
  DbUnavailableError,
  dbUnavailableUserMessage,
  isDbUnavailableError,
} from "@/src/lib/db-errors";

// Bump key when Prisma schema changes so dev HMR doesn't keep a stale client.
const PRISMA_CLIENT_KEY = "prisma_v14";

const globalForPrisma = globalThis as unknown as Record<string, PrismaClient | undefined>;

/** Cap concurrent connections to reduce Hostinger max_connections_per_hour pressure. */
function databaseUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    if (!parsed.searchParams.has("connection_limit")) {
      parsed.searchParams.set("connection_limit", "5");
    }
    if (!parsed.searchParams.has("pool_timeout")) {
      parsed.searchParams.set("pool_timeout", "10");
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

export const prisma =
  globalForPrisma[PRISMA_CLIENT_KEY] ??
  new PrismaClient({
    datasources: { db: { url: databaseUrl() } },
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma[PRISMA_CLIENT_KEY] = prisma;
}

type CacheEntry = { at: number; data: unknown };
const softCache = new Map<string, CacheEntry>();
const SOFT_CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour

export function softCacheSet(key: string, data: unknown): void {
  softCache.set(key, { at: Date.now(), data });
}

export function softCacheGet<T>(key: string): T | null {
  const entry = softCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.at > SOFT_CACHE_TTL_MS) {
    softCache.delete(key);
    return null;
  }
  return entry.data as T;
}

export async function withDbFallback<T>(
  key: string,
  fn: () => Promise<T>,
  fallback: T,
): Promise<{ data: T; stale: boolean; dbError: boolean }> {
  try {
    const data = await fn();
    softCacheSet(key, data);
    return { data, stale: false, dbError: false };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientInitializationError) {
      const cached = softCacheGet<T>(key);
      if (cached !== null) return { data: cached, stale: true, dbError: true };
      return { data: fallback, stale: false, dbError: true };
    }
    if (!isDbUnavailableError(error)) throw error;
    const cached = softCacheGet<T>(key);
    if (cached !== null) {
      return { data: cached, stale: true, dbError: true };
    }
    return { data: fallback, stale: false, dbError: true };
  }
}

export function toDbUnavailableError(error: unknown): DbUnavailableError {
  if (error instanceof DbUnavailableError) return error;
  return new DbUnavailableError(dbUnavailableUserMessage(error), { cause: error });
}
