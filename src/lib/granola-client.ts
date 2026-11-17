// @ts-expect-error Node's native TypeScript runner requires an explicit extension.
import { normalizeRestNote, type GranolaNoteData } from "./granola-parse.ts";

export type GranolaErrorCode = "INVALID_KEY" | "FORBIDDEN" | "RATE_LIMITED" | "NEEDS_RECONNECT" | "UNAVAILABLE";

/** Error de Granola con un código estable; `message` es apto para mostrarse al usuario (sin secretos). */
export class GranolaError extends Error {
  code: GranolaErrorCode;
  constructor(code: GranolaErrorCode, message: string) {
    super(message);
    this.name = "GranolaError";
    this.code = code;
  }
}

/** Lo que el motor de sincronización pide a una fuente (clave API o MCP). */
export type SyncRequest = {
  /** Solo sesiones actualizadas desde esta fecha; `null` = los últimos 30 días. */
  since: Date | null;
  /** Sesiones ya guardadas: id → `updated_at` en ms. Las que no cambiaron no se vuelven a pedir. */
  known: Map<string, number>;
  /** Tope de sesiones cuyo detalle se pide en una corrida (cuida el límite de peticiones y el tiempo). */
  maxDetail: number;
};

/** `complete: false` = quedaron sesiones sin traer (tope, respuesta cortada, límite de ritmo): no hay que dar la ventana por cubierta. */
export type FetchResult = { notes: GranolaNoteData[]; complete: boolean };

export interface GranolaSource {
  /** Comprueba que la conexión funciona; lanza `GranolaError` si no. */
  check(): Promise<void>;
  fetchNotes(request: SyncRequest): Promise<FetchResult>;
}

/** Estado en que queda la conexión tras un fallo: credenciales inservibles piden reconectar; el resto es un error pasajero. */
export const statusForError = (code: string): "NEEDS_RECONNECT" | "ERROR" =>
  code === "INVALID_KEY" || code === "NEEDS_RECONNECT" ? "NEEDS_RECONNECT" : "ERROR";

export const DEFAULT_WINDOW_DAYS = 30;
export const DEFAULT_MAX_DETAIL = 40;

export const isUnchanged = (known: Map<string, number>, id: string, updatedAt: Date | null) => {
  const previous = known.get(id);
  return previous !== undefined && updatedAt !== null && previous === updatedAt.getTime();
};

export const windowStart = (since: Date | null, now = new Date()) =>
  since ?? new Date(now.getTime() - DEFAULT_WINDOW_DAYS * 86_400_000);

const BASE_URL = "https://public-api.granola.ai";
/** La API permite 5 peticiones por segundo sostenidas: se deja un margen entre peticiones. */
const MIN_GAP_MS = 220;
const MAX_LISTED = 200;

type Deps = { fetchFn?: typeof fetch; sleepFn?: (ms: number) => Promise<void>; baseUrl?: string };

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Fuente con la API pública de Granola y una clave `grn_`. */
export function createRestSource(apiKey: string, deps: Deps = {}): GranolaSource {
  const fetchFn = deps.fetchFn ?? fetch;
  const sleep = deps.sleepFn ?? defaultSleep;
  const baseUrl = deps.baseUrl ?? BASE_URL;
  let first = true;

  async function request(path: string, retried = false): Promise<unknown | null> {
    if (!first) await sleep(MIN_GAP_MS);
    first = false;
    let res: Response;
    try {
      res = await fetchFn(`${baseUrl}${path}`, { headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" } });
    } catch {
      throw new GranolaError("UNAVAILABLE", "No se pudo contactar con Granola.");
    }
    if (res.status === 401) throw new GranolaError("INVALID_KEY", "La clave de Granola no es válida o fue revocada.");
    if (res.status === 403) throw new GranolaError("FORBIDDEN", "Granola rechazó el acceso (plan, permisos o cuenta inactiva).");
    if (res.status === 404) return null;
    if (res.status === 429) {
      if (retried) throw new GranolaError("RATE_LIMITED", "Granola pidió bajar el ritmo; se reintentará en la próxima sincronización.");
      await sleep(2000);
      return request(path, true);
    }
    if (!res.ok) throw new GranolaError("UNAVAILABLE", `Granola respondió con error ${res.status}.`);
    try {
      return await res.json();
    } catch {
      throw new GranolaError("UNAVAILABLE", "Granola devolvió una respuesta ilegible.");
    }
  }

  return {
    async check() {
      await request("/v1/notes?page_size=1");
    },

    async fetchNotes({ since, known, maxDetail }) {
      const updatedAfter = windowStart(since).toISOString();
      const listed: { id: string; updatedAt: Date | null }[] = [];
      let cursor: string | null = null;
      do {
        const query = new URLSearchParams({ updated_after: updatedAfter, page_size: "30" });
        if (cursor) query.set("cursor", cursor);
        const page = (await request(`/v1/notes?${query}`)) as { notes?: unknown; hasMore?: unknown; cursor?: unknown } | null;
        for (const item of Array.isArray(page?.notes) ? page.notes : []) {
          const id = typeof item?.id === "string" ? item.id : null;
          if (!id) continue;
          const updated = typeof item.updated_at === "string" ? new Date(item.updated_at) : null;
          listed.push({ id, updatedAt: updated && !Number.isNaN(updated.getTime()) ? updated : null });
        }
        cursor = page?.hasMore === true && typeof page.cursor === "string" ? page.cursor : null;
      } while (cursor && listed.length < MAX_LISTED);

      const notes: GranolaNoteData[] = [];
      let complete = cursor === null;
      for (const item of listed) {
        if (isUnchanged(known, item.id, item.updatedAt)) continue;
        if (notes.length >= maxDetail) {
          complete = false;
          break;
        }
        try {
          const detail = normalizeRestNote(await request(`/v1/notes/${encodeURIComponent(item.id)}`));
          if (detail) notes.push(detail);
        } catch (error) {
          // Con límite de ritmo a media corrida se conserva lo ya traído; el resto queda para la próxima.
          if (error instanceof GranolaError && error.code === "RATE_LIMITED" && notes.length > 0) return { notes, complete: false };
          throw error;
        }
      }
      return { notes, complete };
    },
  };
}
