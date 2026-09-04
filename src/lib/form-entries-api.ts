import { randomBytes, timingSafeEqual } from "crypto";

export const FORM_ENTRIES_LIMIT_DEFAULT = 50;
export const FORM_ENTRIES_LIMIT_MAX = 100;

export function generateFormApiToken(): string {
  return `noxy_${randomBytes(32).toString("hex")}`;
}

export function getBearerToken(req: Request): string | null {
  const header = req.headers.get("authorization");
  if (!header) return null;
  const [scheme, token] = header.split(/\s+/, 2);
  if (!scheme || !token || scheme.toLowerCase() !== "bearer") return null;
  const value = token.trim();
  return value || null;
}

export function tokensMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function parseLimitParam(raw: string | null): number {
  const parsed = Number.parseInt(raw ?? String(FORM_ENTRIES_LIMIT_DEFAULT), 10);
  if (!Number.isFinite(parsed)) return FORM_ENTRIES_LIMIT_DEFAULT;
  return Math.min(FORM_ENTRIES_LIMIT_MAX, Math.max(1, parsed));
}

export function parseOffsetParam(raw: string | null): number {
  const parsed = Number.parseInt(raw ?? "0", 10);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed;
}

export function parseIsoDateParam(raw: string | null): { ok: true; date: Date | null } | { ok: false } {
  if (raw == null || raw.trim() === "") return { ok: true, date: null };
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return { ok: false };
  return { ok: true, date };
}

/** Extrae pares etiqueta/valor de la nota que se guarda al enviar el formulario. */
export function parseFormDetails(description: string | null | undefined): Record<string, string> {
  if (!description) return {};
  const fields: Record<string, string> = {};
  for (const raw of description.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if (/^form details:?$/i.test(line)) continue;
    if (/^variante:/i.test(line)) continue;
    if (/^no additional fields provided\.?$/i.test(line)) continue;
    const idx = line.indexOf(":");
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (!key) continue;
    fields[key] = value;
  }
  return fields;
}
