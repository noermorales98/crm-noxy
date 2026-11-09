// Conexiones MCP de la organización: validación de la entrada y vista sin secretos (Ajustes › Integraciones).

export const MCP_TRANSPORTS = ["http", "sse", "stdio", "otro"] as const;
export type McpTransport = (typeof MCP_TRANSPORTS)[number];

export type McpIntegrationInput = {
  name: string;
  url: string | null;
  transport: McpTransport;
  authToken: string | null;
  note: string | null;
  category: string | null;
};

type ParseResult = { ok: true; value: McpIntegrationInput } | { ok: false; error: string; value?: undefined };

const clean = (value: unknown, max: number): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
};

export function parseIntegrationInput(body: unknown): ParseResult {
  const raw = (body ?? {}) as Record<string, unknown>;
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  if (!name) return { ok: false, error: "El nombre es obligatorio." };
  if (name.length > 80) return { ok: false, error: "El nombre admite hasta 80 caracteres." };

  const transport = (raw.transport ?? "http") as string;
  if (!(MCP_TRANSPORTS as readonly string[]).includes(transport)) return { ok: false, error: "Tipo de conexión no válido." };

  const url = clean(raw.url, 2000);
  if (url) {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return { ok: false, error: "La URL debe empezar con http:// o https://." };
    } catch {
      return { ok: false, error: "La URL no es válida." };
    }
  }

  return {
    ok: true,
    value: { name, url, transport: transport as McpTransport, authToken: clean(raw.authToken, 4000), note: clean(raw.note, 1000), category: clean(raw.category, 60) },
  };
}

export type McpIntegrationRecord = {
  id: string;
  name: string;
  url: string | null;
  transport: string;
  authToken: string | null;
  enabled: boolean;
  source: string;
  category: string | null;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
  organizationId: string;
};

/** Lo que se envía al navegador: nunca el token, solo si existe. */
export function redactIntegration(record: McpIntegrationRecord) {
  return {
    id: record.id,
    name: record.name,
    url: record.url,
    transport: record.transport,
    enabled: record.enabled,
    source: record.source,
    category: record.category,
    note: record.note,
    hasToken: Boolean(record.authToken),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}
