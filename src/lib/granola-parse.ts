/**
 * Lectura de lo que devuelve Granola: pasos dentro de un resumen, el XML del servidor MCP y la nota JSON de la API.
 * Todo se normaliza a `GranolaNoteData`, de modo que el resto del CRM no sabe por qué vía llegó la sesión.
 */

export type GranolaAttendee = { name: string | null; email: string };

export type GranolaNoteData = {
  granolaId: string;
  title: string | null;
  url: string | null;
  startedAt: Date | null;
  endedAt: Date | null;
  attendees: GranolaAttendee[];
  /** `null` = la fuente no trajo resumen (solo listado); `""` no se usa. */
  summary: string | null;
  privateNotes: string | null;
  updatedAt: Date | null;
};

const MAX_ITEMS = 30;
const MAX_ITEM_LENGTH = 500;

const STEPS_HEADING =
  /^(#{1,6})\s*(?:\*\*)?\s*(siguientes?\s+pasos?|pr[oó]ximos?\s+pasos?|pasos?\s+a\s+seguir|pasos?|acciones?(?:\s+a\s+realizar)?|tareas|pendientes|action\s+items?|next\s+steps?|to-?dos?|follow-?ups?)\b/i;
const ANY_HEADING = /^(#{1,6})\s+\S/;
const BULLET = /^\s*(?:[-*•]|\d+[.)])\s+(.*)$/;
const CHECKBOX = /^\s*[-*]\s+\[( |x|X)\]\s+(.*)$/;

function cleanItem(raw: string): string {
  return raw
    .replace(/^\[[ xX]\]\s*/, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_ITEM_LENGTH);
}

/**
 * Pasos de la reunión: viñetas bajo un encabezado como «Siguientes pasos» / «Action items», más las casillas
 * pendientes `- [ ]` en cualquier parte. Las casillas ya marcadas no cuentan. Sin duplicados, máximo 30.
 */
export function parseActionItems(summary: string | null | undefined): string[] {
  if (!summary) return [];
  const found: string[] = [];
  const seen = new Set<string>();
  const add = (text: string) => {
    const clean = cleanItem(text);
    const key = clean.toLowerCase();
    if (!clean || seen.has(key) || found.length >= MAX_ITEMS) return;
    seen.add(key);
    found.push(clean);
  };

  let collecting = false;
  for (const line of summary.split(/\r?\n/)) {
    const heading = ANY_HEADING.exec(line);
    if (heading) {
      collecting = STEPS_HEADING.test(line);
      continue;
    }
    const box = CHECKBOX.exec(line);
    if (box) {
      if (box[1] === " ") add(box[2]);
      continue;
    }
    if (!collecting) continue;
    const bullet = BULLET.exec(line);
    if (bullet) add(bullet[1]);
  }
  return found;
}

function decodeEntities(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

function parseAttributes(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const match of raw.matchAll(/([\w-]+)="([^"]*)"/g)) out[match[1]] = decodeEntities(match[2]);
  return out;
}

function toDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

const EMAIL = /[^\s()<>,;]+@[^\s()<>,;]+\.[^\s()<>,;]+/;

/** Línea de `<known_participants>`: «Nombre (rol) from Empresa (correo)». Sin correo no sirve para emparejar. */
export function parseParticipantLine(line: string): GranolaAttendee | null {
  const email = EMAIL.exec(line)?.[0]?.toLowerCase();
  if (!email) return null;
  const beforeParen = line.split(" (")[0].trim();
  const name = beforeParen && !EMAIL.test(beforeParen) ? beforeParen : null;
  return { name, email };
}

/** Cuántas `<meeting>` abre la respuesta; si es más que las que `parseMcpMeetings` devuelve, la respuesta llegó cortada. */
export function countMeetingTags(xml: string): number {
  return (xml.match(/<meeting\s/g) ?? []).length;
}

/**
 * Lee las `<meeting>` de la respuesta XML de `search_meetings` / `get_meetings`.
 * Una `<meeting>` sin su cierre (respuesta cortada) se descarta: guardarla dejaría un resumen truncado como definitivo.
 */
export function parseMcpMeetings(xml: string): GranolaNoteData[] {
  const notes: GranolaNoteData[] = [];
  for (const match of xml.matchAll(/<meeting\s+([^>]*)>([\s\S]*?)<\/meeting>/g)) {
    const attrs = parseAttributes(match[1]);
    const body = match[2];
    const id = attrs.id;
    if (!id) continue;

    const attendees: GranolaAttendee[] = [];
    const participants = /<known_participants>([\s\S]*?)<\/known_participants>/.exec(body);
    for (const line of participants?.[1].split(/\r?\n/) ?? []) {
      const parsed = parseParticipantLine(line.trim());
      if (parsed && !attendees.some((a) => a.email === parsed.email)) attendees.push(parsed);
    }

    const summaryMatch = /<summary>([\s\S]*?)<\/summary>/.exec(body);
    const summary = summaryMatch ? decodeEntities(summaryMatch[1]).trim() || null : null;

    let privateNotes: string | null = null;
    const privateMatch = /<private_notes(?:\s+[^>]*?)?>([\s\S]*?)<\/private_notes>/.exec(body);
    if (privateMatch) privateNotes = decodeEntities(privateMatch[1]).trim() || null;

    notes.push({
      granolaId: id,
      title: attrs.title ?? null,
      url: attrs.url ?? null,
      startedAt: toDate(attrs.meeting_at) ?? toDate(attrs.created_at),
      endedAt: null,
      attendees,
      summary,
      privateNotes,
      updatedAt: toDate(attrs.updated_at),
    });
  }
  return notes;
}

type RestNote = {
  id?: unknown;
  title?: unknown;
  web_url?: unknown;
  created_at?: unknown;
  updated_at?: unknown;
  attendees?: unknown;
  calendar_event?: { scheduled_start_time?: unknown; scheduled_end_time?: unknown; invitees?: unknown } | null;
  summary_markdown?: unknown;
  summary_text?: unknown;
  private_notes_markdown?: unknown;
  private_notes_text?: unknown;
};

const str = (value: unknown): string | null => (typeof value === "string" && value.trim() ? value : null);

/** Nota de la API REST (`GET /v1/notes/{id}`) → nota normalizada. Devuelve `null` si no trae un id usable. */
export function normalizeRestNote(raw: unknown): GranolaNoteData | null {
  if (!raw || typeof raw !== "object") return null;
  const note = raw as RestNote;
  const id = str(note.id);
  if (!id) return null;

  const attendees: GranolaAttendee[] = [];
  const push = (email: unknown, name: unknown) => {
    const e = str(email)?.toLowerCase();
    if (e && !attendees.some((a) => a.email === e)) attendees.push({ name: str(name), email: e });
  };
  if (Array.isArray(note.attendees)) for (const a of note.attendees) push((a as { email?: unknown })?.email, (a as { name?: unknown })?.name);
  if (Array.isArray(note.calendar_event?.invitees)) for (const a of note.calendar_event.invitees) push((a as { email?: unknown })?.email, null);

  return {
    granolaId: id,
    title: str(note.title),
    url: str(note.web_url),
    startedAt: toDate(str(note.calendar_event?.scheduled_start_time)) ?? toDate(str(note.created_at)),
    endedAt: toDate(str(note.calendar_event?.scheduled_end_time)),
    attendees,
    summary: str(note.summary_markdown) ?? str(note.summary_text),
    privateNotes: str(note.private_notes_markdown) ?? str(note.private_notes_text),
    updatedAt: toDate(str(note.updated_at)),
  };
}
