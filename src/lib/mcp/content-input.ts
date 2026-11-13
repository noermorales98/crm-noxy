// Validación de las piezas del calendario de contenido para el MCP. Mismas reglas que las rutas /api/content.
// @ts-expect-error Node's native TypeScript runner requires an explicit extension.
import { parsePublishStatus, uploadedAtForStatus } from "../content-publish.ts";
// @ts-expect-error Node's native TypeScript runner requires an explicit extension.
import { parseReminderDaysBefore } from "../content-reminder-options.ts";

export const CONTENT_TYPES = ["video", "reel", "flyer", "historia", "entrega", "edicion"] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

/** Campos de ContentItem listos para Prisma. */
export type ItemData = Record<string, string | boolean | number | Date | null>;

/** Día `YYYY-MM-DD` fijado a mediodía UTC (como las rutas); una fecha con hora se respeta tal cual. */
export function parseItemDate(value: unknown): Date | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const text = value.trim();
  const date = new Date(text.length === 10 ? `${text}T12:00:00Z` : text);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function monthRange(month: string): { from: Date; to: Date } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) return null;
  const year = Number(match[1]);
  const index = Number(match[2]) - 1;
  if (index < 0 || index > 11) return null;
  return { from: new Date(Date.UTC(year, index, 1)), to: new Date(Date.UTC(year, index + 1, 1)) };
}

export type ItemInput = {
  title?: string | null;
  date?: string | null;
  type?: string | null;
  time?: string | null;
  hook?: string | null;
  hooksAlt?: string[] | null;
  script?: string | null;
  caption?: string | null;
  cta?: string | null;
  tips?: string | null;
  note?: string | null;
  publishStatus?: string | null;
  reminderEnabled?: boolean | null;
  reminderDaysBefore?: number | null;
};

const TEXT_FIELDS = ["time", "hook", "script", "caption", "cta", "tips", "note"] as const;
const cleanHooks = (hooks: string[]) => JSON.stringify(hooks.filter((hook) => typeof hook === "string" && hook.trim()));

type CreateResult = { ok: true; data: ItemData } | { ok: false; error: string; data?: undefined };

/** Datos para crear una pieza; `clientReminderDays` es el recordatorio por defecto del cliente. */
export function buildItemCreateData(input: ItemInput, clientReminderDays: number): CreateResult {
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const date = parseItemDate(input.date);
  if (!title) return { ok: false, error: "El título es obligatorio." };
  if (!date) return { ok: false, error: "La fecha es obligatoria (YYYY-MM-DD)." };
  const data: ItemData = {
    title,
    date,
    type: (CONTENT_TYPES as readonly string[]).includes(input.type ?? "") ? (input.type as string) : "video",
    publishStatus: parsePublishStatus(input.publishStatus),
    reminderEnabled: input.reminderEnabled === true,
    reminderDaysBefore: parseReminderDaysBefore(input.reminderDaysBefore, clientReminderDays),
    hooksAlt: Array.isArray(input.hooksAlt) ? cleanHooks(input.hooksAlt) : null,
  };
  for (const key of TEXT_FIELDS) data[key] = (input[key] as string | null | undefined) || null;
  data.uploadedAt = uploadedAtForStatus(data.publishStatus as never, null, null);
  return { ok: true, data };
}

/** Solo los campos enviados; `null` borra un texto. `before` da el estado anterior para `uploadedAt`. */
export function buildItemUpdateData(
  input: ItemInput,
  before: { publishStatus: string; uploadedAt: Date | null; reminderDaysBefore: number },
): ItemData {
  const data: ItemData = {};
  if (typeof input.title === "string" && input.title.trim()) data.title = input.title.trim();
  if (typeof input.type === "string" && (CONTENT_TYPES as readonly string[]).includes(input.type)) data.type = input.type;
  const date = parseItemDate(input.date);
  if (date) data.date = date;
  for (const key of TEXT_FIELDS) {
    const value = input[key];
    if (typeof value === "string" || value === null) data[key] = value || null;
  }
  if (Array.isArray(input.hooksAlt)) data.hooksAlt = cleanHooks(input.hooksAlt);
  if (input.publishStatus !== undefined && input.publishStatus !== null) {
    const status = parsePublishStatus(input.publishStatus, before.publishStatus as never);
    data.publishStatus = status;
    data.uploadedAt = uploadedAtForStatus(status, before.publishStatus, before.uploadedAt);
  }
  if (typeof input.reminderEnabled === "boolean") data.reminderEnabled = input.reminderEnabled;
  if (input.reminderDaysBefore !== undefined && input.reminderDaysBefore !== null) {
    data.reminderDaysBefore = parseReminderDaysBefore(input.reminderDaysBefore, before.reminderDaysBefore);
  }
  return data;
}
