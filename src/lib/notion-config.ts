// Ajustes de Notion de la organización (token + base de leads): validación de la entrada y vista sin secretos.

const UUID = /(?<![0-9a-f])[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?![0-9a-f])/i;
const HEX32 = /(?<![0-9a-f])[0-9a-f]{32}(?![0-9a-f])/i;

/** Id de 32 caracteres de una base de Notion, a partir de un enlace, un id suelto o un uuid con guiones. */
export function extractNotionDatabaseId(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const text = input.trim();
  const found = text.match(HEX32)?.[0] ?? text.match(UUID)?.[0].replace(/-/g, "");
  return found ? found.toLowerCase() : null;
}

type ParseResult =
  | { ok: true; value: { token: string | null; databaseId: string } }
  | { ok: false; error: string; value?: undefined };

/** `hasToken`: ya hay uno guardado, así que dejarlo en blanco lo conserva. */
export function parseNotionConfigInput(body: unknown, hasToken: boolean): ParseResult {
  const raw = (body ?? {}) as Record<string, unknown>;
  const databaseId = extractNotionDatabaseId(raw.databaseId);
  if (!databaseId) return { ok: false, error: "Pega el enlace o el id de la base de leads de Notion." };
  const token = typeof raw.token === "string" ? raw.token.trim().slice(0, 4000) : "";
  if (!token && !hasToken) return { ok: false, error: "El token de la integración de Notion es obligatorio." };
  return { ok: true, value: { token: token || null, databaseId } };
}

export type NotionConfigView = { configured: boolean; hasToken: boolean; databaseId: string | null; source: "db" | "env" | "none" };
