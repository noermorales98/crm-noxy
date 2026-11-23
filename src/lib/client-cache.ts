// Caché en memoria del navegador para pantallas que cargan datos con fetch: al volver a una pantalla se pinta al instante
// con lo último que se vio y se actualiza en segundo plano (revalidar), en vez de enseñar un esqueleto cada vez.

type Entry = { data: unknown; at: number };
const store = new Map<string, Entry>();

/** Lo guardado si no es más viejo que `maxAgeMs`; si no, `undefined`. */
export function readCache<T>(key: string, maxAgeMs: number, now = Date.now()): T | undefined {
  const entry = store.get(key);
  if (!entry || now - entry.at > maxAgeMs) return undefined;
  return entry.data as T;
}

export function writeCache(key: string, data: unknown, now = Date.now()): void {
  store.set(key, { data, at: now });
}

/** Borra una clave, o todas las que empiezan por el prefijo (p. ej. al cambiar de cuenta). */
export function clearCache(prefix?: string): void {
  if (!prefix) return store.clear();
  for (const key of [...store.keys()]) if (key.startsWith(prefix)) store.delete(key);
}
