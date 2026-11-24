// Varias cuentas (claves) por proveedor de IA. Funciones puras, sin base de datos ni red.
// Se guardan juntas, cifradas, en una sola fila por organización y proveedor (JSON versión 2). Una fila antigua guarda una
// sola clave como texto plano cifrado: se lee como una cuenta «Principal» y se reescribe en el formato nuevo al primer cambio.

export type PoolKey = {
  id: string;
  label: string;
  key: string;
  enabled: boolean;
  /** Último fallo de esta cuenta (ISO) y el estado HTTP que lo causó; `null` = funciona. */
  failedAt: string | null;
  lastStatus: number | null;
};

export type KeyPool = PoolKey[];

const newId = () => (globalThis.crypto?.randomUUID?.() ?? `k${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`).slice(0, 12);

/** Texto guardado (ya descifrado) → cuentas. Acepta el formato nuevo y el antiguo (una clave suelta). */
export function parsePool(stored: string | null | undefined): KeyPool {
  const text = (stored ?? "").trim();
  if (!text) return [];
  if (text.startsWith("{")) {
    try {
      const data = JSON.parse(text) as { v?: number; keys?: Partial<PoolKey>[] };
      if (data.v === 2 && Array.isArray(data.keys)) {
        return data.keys
          .filter((k): k is Partial<PoolKey> & { key: string } => typeof k.key === "string" && k.key.length > 0)
          .map((k, i) => ({
            id: typeof k.id === "string" && k.id ? k.id : newId(),
            label: typeof k.label === "string" && k.label.trim() ? k.label.trim() : `Cuenta ${i + 1}`,
            key: k.key,
            enabled: k.enabled !== false,
            failedAt: typeof k.failedAt === "string" ? k.failedAt : null,
            lastStatus: typeof k.lastStatus === "number" ? k.lastStatus : null,
          }));
      }
    } catch {
      /* no era JSON: se trata como clave suelta */
    }
  }
  return [{ id: "principal", label: "Principal", key: text, enabled: true, failedAt: null, lastStatus: null }];
}

export function serializePool(pool: KeyPool): string {
  return JSON.stringify({ v: 2, keys: pool });
}

const MAX_LABEL = 40;
const MAX_ACCOUNTS = 10;

export function addKey(pool: KeyPool, input: { label?: string; key: string }): { ok: true; pool: KeyPool; id: string } | { ok: false; error: string } {
  const key = input.key.trim();
  if (!key) return { ok: false, error: "Pega la clave." };
  if (pool.some((k) => k.key === key)) return { ok: false, error: "Esa cuenta ya está agregada." };
  if (pool.length >= MAX_ACCOUNTS) return { ok: false, error: `Máximo ${MAX_ACCOUNTS} cuentas por proveedor.` };
  const label = (input.label ?? "").trim().slice(0, MAX_LABEL) || `Cuenta ${pool.length + 1}`;
  const id = newId();
  return { ok: true, id, pool: [...pool, { id, label, key, enabled: true, failedAt: null, lastStatus: null }] };
}

export const removeKey = (pool: KeyPool, id: string): KeyPool => pool.filter((k) => k.id !== id);

export const updateKey = (pool: KeyPool, id: string, patch: { enabled?: boolean; label?: string }): KeyPool =>
  pool.map((k) =>
    k.id !== id
      ? k
      : {
          ...k,
          ...(patch.enabled !== undefined ? { enabled: patch.enabled, ...(patch.enabled ? { failedAt: null, lastStatus: null } : {}) } : {}),
          ...(patch.label !== undefined && patch.label.trim() ? { label: patch.label.trim().slice(0, MAX_LABEL) } : {}),
        },
  );

/** Sube o baja una cuenta en el orden de uso. */
export function moveKey(pool: KeyPool, id: string, direction: "up" | "down"): KeyPool {
  const i = pool.findIndex((k) => k.id === id);
  const j = direction === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= pool.length) return pool;
  const next = [...pool];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

/** Fallos que no se arreglan solos (clave mala, sin créditos, sin permiso) frente a los pasajeros (límite de ritmo, servidor). */
export const isPersistentStatus = (status: number | null | undefined): boolean => status === 401 || status === 402 || status === 403;

const PERSISTENT_COOLDOWN_MS = 30 * 60_000;
const TRANSIENT_COOLDOWN_MS = 2 * 60_000;

/** ¿Esta cuenta falló hace poco? Mientras dure el enfriamiento se deja para el final, no se descarta. */
export function isCoolingDown(key: PoolKey, now = Date.now()): boolean {
  if (!key.failedAt) return false;
  const wait = isPersistentStatus(key.lastStatus) ? PERSISTENT_COOLDOWN_MS : TRANSIENT_COOLDOWN_MS;
  return now - new Date(key.failedAt).getTime() < wait;
}

/** Orden de uso: las cuentas activas y sanas primero (en el orden del usuario), las que fallaron hace poco al final. Las apagadas no entran. */
export function usableKeys(pool: KeyPool, now = Date.now()): PoolKey[] {
  const active = pool.filter((k) => k.enabled);
  return [...active.filter((k) => !isCoolingDown(k, now)), ...active.filter((k) => isCoolingDown(k, now))];
}

/** Anota el resultado de una llamada: `status` ok (200-299) limpia el fallo; otro estado lo guarda. */
export function markResult(pool: KeyPool, id: string, status: number, now = Date.now()): KeyPool {
  const ok = status >= 200 && status < 300;
  return pool.map((k) => (k.id !== id ? k : ok ? { ...k, failedAt: null, lastStatus: null } : { ...k, failedAt: new Date(now).toISOString(), lastStatus: status }));
}

/** `nvapi-…ab12`: lo justo para reconocer la cuenta sin mostrar la clave. */
export function maskKey(key: string): string {
  const k = key.trim();
  if (k.length <= 8) return "••••";
  const head = k.startsWith("nvapi-") ? "nvapi-" : k.startsWith("sk-or-") ? "sk-or-" : k.slice(0, 3);
  return `${head}…${k.slice(-4)}`;
}
