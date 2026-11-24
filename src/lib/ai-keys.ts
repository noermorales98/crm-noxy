import { prisma } from "@/src/lib/db";
import { appSecretKey, decryptSecret, encryptSecret } from "@/src/lib/secret-box";
import { providerKeys, type ChatProvider, type KeySource } from "@/src/lib/ai-provider";
import { addKey, isCoolingDown, markResult, maskKey, moveKey, parsePool, removeKey, serializePool, updateKey, usableKeys, type KeyPool } from "@/src/lib/ai-key-pool";
import { DEFAULT_AI_PREFS, parseAiPrefs, type AiPrefs } from "@/src/lib/ai-failover";

/**
 * Cuentas (claves) de los proveedores de IA de una organización. Cada proveedor admite VARIAS cuentas, guardadas cifradas en
 * la base (Ajustes › Modelos de IA); las variables de entorno del servidor se suman al final como cuentas de respaldo.
 * Si la tabla aún no existe (código desplegado antes de la migración) se trata como «sin claves en la base», sin romper la IA.
 */

/** Una cuenta lista para usar. `id` identifica la cuenta guardada (`env-1`… para las del servidor, que no se editan). */
export type ProviderEntry = { id: string; label: string; key: string; source: "db" | "env" };

const PREFS_PROVIDER = "prefs"; // fila aparte de la misma tabla: no es una clave, guarda las preferencias en JSON

function logStorage(what: string, error: unknown) {
  // Sin el texto del error (podría traer datos de la consulta): solo su tipo y, si lo hay, el código de Prisma (p. ej. P2021 = falta la tabla).
  const code = (error as { code?: string } | null)?.code;
  console.warn(`[ai-keys] ${what}:`, error instanceof Error ? error.name : "error", code ?? "");
}

// Memoria breve por instancia: las cuentas y preferencias casi nunca cambian y leerlas (más descifrar) en cada mensaje
// sumaba viajes a la base remota. Se invalida al guardar; otra instancia lo ve como mucho a los 30 s.
const READ_TTL_MS = 30_000;
const poolCache = new Map<string, { at: number; value: { pool: KeyPool; unreadable: boolean } }>();
const prefsCache = new Map<string, { at: number; value: AiPrefs }>();

/** Cuentas guardadas en la base. `unreadable`: hay una fila que ya no se puede descifrar (p. ej. cambió AUTH_SECRET). */
export async function loadPool(organizationId: string, provider: ChatProvider): Promise<{ pool: KeyPool; unreadable: boolean }> {
  const cacheKey = `${organizationId}:${provider}`;
  const hit = poolCache.get(cacheKey);
  if (hit && Date.now() - hit.at < READ_TTL_MS) return { pool: hit.value.pool.map((k) => ({ ...k })), unreadable: hit.value.unreadable };
  const value = await readPool(organizationId, provider);
  poolCache.set(cacheKey, { at: Date.now(), value });
  return { pool: value.pool.map((k) => ({ ...k })), unreadable: value.unreadable };
}

async function readPool(organizationId: string, provider: ChatProvider): Promise<{ pool: KeyPool; unreadable: boolean }> {
  try {
    const row = await prisma.aiProviderKey.findUnique({ where: { organizationId_provider: { organizationId, provider } } });
    if (!row) return { pool: [], unreadable: false };
    const plain = decryptSecret(row.apiKey, appSecretKey());
    return plain ? { pool: parsePool(plain), unreadable: false } : { pool: [], unreadable: true };
  } catch (error) {
    logStorage("no se pudieron leer las cuentas guardadas", error);
    return { pool: [], unreadable: false };
  }
}

async function savePool(organizationId: string, provider: ChatProvider, pool: KeyPool): Promise<void> {
  forgetNvidiaModels(organizationId);
  poolCache.delete(`${organizationId}:${provider}`);
  if (pool.length === 0) {
    await prisma.aiProviderKey.deleteMany({ where: { organizationId, provider } });
    return;
  }
  const apiKey = encryptSecret(serializePool(pool), appSecretKey());
  await prisma.aiProviderKey.upsert({ where: { organizationId_provider: { organizationId, provider } }, create: { organizationId, provider, apiKey }, update: { apiKey } });
}

/** Cuentas a probar, en orden: las de la base (sanas primero, activas) y luego las del servidor. */
export async function resolveProviderEntries(organizationId: string, provider: ChatProvider): Promise<ProviderEntry[]> {
  const { pool } = await loadPool(organizationId, provider);
  const db: ProviderEntry[] = usableKeys(pool).map((k) => ({ id: k.id, label: k.label, key: k.key, source: "db" }));
  const env: ProviderEntry[] = providerKeys(provider, process.env).map((key, i) => ({ id: `env-${i + 1}`, label: `Servidor ${i + 1}`, key, source: "env" }));
  return [...db, ...env];
}

export async function resolveProviderKeys(organizationId: string, provider: ChatProvider): Promise<{ keys: string[]; source: KeySource }> {
  const entries = await resolveProviderEntries(organizationId, provider);
  return { keys: entries.map((e) => e.key), source: entries.length ? (entries.some((e) => e.source === "db") ? "db" : "env") : "none" };
}

/** Anota si una cuenta funcionó o falló (solo las guardadas en la base, y solo si el estado cambió, para no escribir de más). */
export async function recordKeyResult(organizationId: string, provider: ChatProvider, id: string, status: number): Promise<void> {
  if (id.startsWith("env-")) return;
  try {
    const { pool } = await loadPool(organizationId, provider);
    const before = pool.find((k) => k.id === id);
    if (!before) return;
    const ok = status >= 200 && status < 300;
    if (ok ? before.failedAt === null : before.lastStatus === status && isCoolingDown(before)) return;
    await savePool(organizationId, provider, markResult(pool, id, status));
  } catch (error) {
    logStorage("no se pudo anotar el resultado de la cuenta", error);
  }
}

export type AccountView = {
  id: string;
  label: string;
  mask: string;
  source: "db" | "env";
  enabled: boolean;
  /** Falló hace poco: se usa al final. */
  failing: boolean;
  lastStatus: number | null;
  failedAt: string | null;
};

/** Cuentas de cada proveedor para la pantalla de Ajustes. Nunca devuelve la clave completa. */
export async function describeAccounts(organizationId: string): Promise<{ provider: ChatProvider; accounts: AccountView[]; unreadable: boolean }[]> {
  const out: { provider: ChatProvider; accounts: AccountView[]; unreadable: boolean }[] = [];
  for (const provider of ["nvidia", "openrouter"] as const) {
    const { pool, unreadable } = await loadPool(organizationId, provider);
    const db: AccountView[] = pool.map((k) => ({ id: k.id, label: k.label, mask: maskKey(k.key), source: "db", enabled: k.enabled, failing: isCoolingDown(k), lastStatus: k.lastStatus, failedAt: k.failedAt }));
    const env: AccountView[] = providerKeys(provider, process.env).map((key, i) => ({ id: `env-${i + 1}`, label: `Servidor ${i + 1}`, mask: maskKey(key), source: "env", enabled: true, failing: false, lastStatus: null, failedAt: null }));
    out.push({ provider, accounts: [...db, ...env], unreadable });
  }
  return out;
}

export type ProviderKeyStatus = { provider: ChatProvider; source: KeySource; unreadable?: boolean };

/** Estado por proveedor (¿hay alguna cuenta y de dónde?), para saber si un modelo está configurado. */
export async function describeProviderKeys(organizationId: string): Promise<ProviderKeyStatus[]> {
  const all = await describeAccounts(organizationId);
  return all.map(({ provider, accounts, unreadable }) => ({
    provider,
    source: accounts.some((a) => a.source === "db") ? "db" : accounts.length ? "env" : "none",
    unreadable: unreadable || undefined,
  }));
}

export async function addProviderAccount(organizationId: string, provider: ChatProvider, input: { label?: string; key: string }) {
  const { pool } = await loadPool(organizationId, provider);
  const result = addKey(pool, input);
  if (!result.ok) return result;
  await savePool(organizationId, provider, result.pool);
  return { ok: true as const, id: result.id };
}

export async function updateProviderAccount(organizationId: string, provider: ChatProvider, id: string, patch: { enabled?: boolean; label?: string; move?: "up" | "down" }) {
  const { pool } = await loadPool(organizationId, provider);
  if (!pool.some((k) => k.id === id)) return false;
  let next = updateKey(pool, id, patch);
  if (patch.move) next = moveKey(next, id, patch.move);
  await savePool(organizationId, provider, next);
  return true;
}

export async function removeProviderAccount(organizationId: string, provider: ChatProvider, id: string) {
  const { pool } = await loadPool(organizationId, provider);
  await savePool(organizationId, provider, removeKey(pool, id));
}

/** Compatibilidad: guarda UNA clave reemplazando las anteriores (la pantalla vieja). */
export async function saveProviderKey(organizationId: string, provider: ChatProvider, key: string): Promise<void> {
  const added = addKey([], { label: "Principal", key });
  if (added.ok) await savePool(organizationId, provider, added.pool);
}

export async function deleteProviderKey(organizationId: string, provider: ChatProvider): Promise<void> {
  forgetNvidiaModels(organizationId);
  await prisma.aiProviderKey.deleteMany({ where: { organizationId, provider } });
}

/** Comprueba la clave contra NVIDIA sin guardarla. `unreachable` = no se pudo decidir (red o servidor): no es una clave mala. */
export async function checkNvidiaKey(key: string): Promise<"valid" | "invalid" | "unreachable"> {
  try {
    const res = await fetch("https://integrate.api.nvidia.com/v1/models", { headers: { Authorization: `Bearer ${key}`, Accept: "application/json" }, signal: AbortSignal.timeout(8000) });
    if (res.status === 401 || res.status === 403) return "invalid";
    return res.ok ? "valid" : "unreachable";
  } catch {
    return "unreachable";
  }
}

/** Igual para OpenRouter. Una clave sin créditos sigue siendo válida (el 402 llega al usarla), así que solo 401 la descarta. */
export async function checkOpenRouterKey(key: string): Promise<"valid" | "invalid" | "unreachable"> {
  try {
    const res = await fetch("https://openrouter.ai/api/v1/auth/key", { headers: { Authorization: `Bearer ${key}`, Accept: "application/json" }, signal: AbortSignal.timeout(8000) });
    if (res.status === 401 || res.status === 403) return "invalid";
    return res.ok ? "valid" : "unreachable";
  } catch {
    return "unreachable";
  }
}

const MODELS_TTL_MS = 10 * 60_000;
const modelsCache = new Map<string, { at: number; ids: string[] }>();

/**
 * Ids de los modelos que NVIDIA ofrece HOY (sin prefijo), o `null` si no hay cuenta o no se pudo consultar. Prueba cada cuenta
 * hasta que una responda, así una cuenta caída no esconde la lista. Se guarda 10 minutos. Nunca devuelve ninguna clave.
 */
export async function listNvidiaModelIds(organizationId: string): Promise<string[] | null> {
  const cached = modelsCache.get(organizationId);
  if (cached && Date.now() - cached.at < MODELS_TTL_MS) return cached.ids;
  const entries = await resolveProviderEntries(organizationId, "nvidia");
  for (const entry of entries) {
    try {
      const res = await fetch("https://integrate.api.nvidia.com/v1/models", { headers: { Authorization: `Bearer ${entry.key}`, Accept: "application/json" }, signal: AbortSignal.timeout(6000) });
      if (!res.ok) continue;
      const body = (await res.json().catch(() => null)) as { data?: { id?: unknown }[] } | null;
      const ids = (body?.data ?? []).map((m) => m.id).filter((id): id is string => typeof id === "string");
      if (!ids.length) continue;
      modelsCache.set(organizationId, { at: Date.now(), ids });
      return ids;
    } catch {
      continue;
    }
  }
  return null;
}

/** Al cambiar las cuentas, la lista guardada ya no vale. */
export const forgetNvidiaModels = (organizationId: string) => void modelsCache.delete(organizationId);

// ─── Preferencias (modelo predeterminado, cambio automático, respaldos) ──────────────────────────────

export async function getAiPrefs(organizationId: string): Promise<AiPrefs> {
  const hit = prefsCache.get(organizationId);
  if (hit && Date.now() - hit.at < READ_TTL_MS) return { ...hit.value, fallbackModelIds: [...hit.value.fallbackModelIds] };
  try {
    const row = await prisma.aiProviderKey.findUnique({ where: { organizationId_provider: { organizationId, provider: PREFS_PROVIDER } } });
    const value = row ? parseAiPrefs(row.apiKey) : { ...DEFAULT_AI_PREFS };
    prefsCache.set(organizationId, { at: Date.now(), value });
    return { ...value, fallbackModelIds: [...value.fallbackModelIds] };
  } catch (error) {
    logStorage("no se pudieron leer las preferencias de IA", error);
    return { ...DEFAULT_AI_PREFS };
  }
}

export async function saveAiPrefs(organizationId: string, patch: Partial<AiPrefs>): Promise<AiPrefs> {
  prefsCache.delete(organizationId);
  const next: AiPrefs = { ...(await getAiPrefs(organizationId)), ...patch };
  const apiKey = JSON.stringify(next);
  await prisma.aiProviderKey.upsert({ where: { organizationId_provider: { organizationId, provider: PREFS_PROVIDER } }, create: { organizationId, provider: PREFS_PROVIDER, apiKey }, update: { apiKey } });
  prefsCache.delete(organizationId);
  return next;
}
