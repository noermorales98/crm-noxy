/** Lo que el navegador puede saber de la conexión con Granola: nunca claves, tokens ni identificadores de OAuth. */
export type GranolaConnectionView = {
  connected: boolean;
  mode: "API_KEY" | "MCP" | null;
  /** CONNECTED | PENDING | NEEDS_RECONNECT | ERROR */
  status: string | null;
  lastSyncAt: string | null;
  lastSyncCount: number;
  lastSyncError: string | null;
};

export const NOT_CONNECTED: GranolaConnectionView = {
  connected: false,
  mode: null,
  status: null,
  lastSyncAt: null,
  lastSyncCount: 0,
  lastSyncError: null,
};

type ConfigRow = {
  mode: string;
  status: string;
  lastSyncAt: Date | null;
  lastSyncCount: number;
  lastSyncError: string | null;
};

export function viewOfConfig(row: ConfigRow | null): GranolaConnectionView {
  if (!row) return NOT_CONNECTED;
  return {
    connected: row.status === "CONNECTED",
    mode: row.mode === "MCP" ? "MCP" : "API_KEY",
    status: row.status,
    lastSyncAt: row.lastSyncAt ? row.lastSyncAt.toISOString() : null,
    lastSyncCount: row.lastSyncCount,
    lastSyncError: row.lastSyncError,
  };
}

/** Una clave de la API de Granola empieza por `grn_`; se valida la forma antes de molestar a Granola. */
export function parseGranolaApiKey(input: unknown): { ok: true; key: string } | { ok: false; error: string } {
  const key = typeof input === "string" ? input.trim() : "";
  if (!key) return { ok: false, error: "Pega la clave de la API de Granola." };
  if (!/^grn_[A-Za-z0-9_-]{8,}$/.test(key)) return { ok: false, error: "La clave debe empezar por grn_ y no llevar espacios." };
  return { ok: true, key };
}
