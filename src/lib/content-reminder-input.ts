// @ts-expect-error Node's native TypeScript runner requires an explicit extension.
import { parseReminderDaysBefore } from "./content-reminder-options.ts";

export type BulkReminderInput = {
  clientIds: string[] | "all";
  enabled: boolean;
  hour?: number;
  minute?: number;
  daysBefore?: number;
};

export type ParsedBulk = { ok: true; value: BulkReminderInput } | { ok: false; error: string };

/** Valida el cuerpo de la acción por lotes. Puro: sin base de datos. */
export function parseBulkReminderInput(body: unknown): ParsedBulk {
  if (!body || typeof body !== "object") return { ok: false, error: "Cuerpo inválido" };
  const raw = body as Record<string, unknown>;
  if (typeof raw.enabled !== "boolean") return { ok: false, error: "`enabled` debe ser verdadero o falso" };

  let clientIds: string[] | "all";
  if (raw.clientIds === "all") clientIds = "all";
  else if (Array.isArray(raw.clientIds) && raw.clientIds.length > 0 && raw.clientIds.every((id) => typeof id === "string" && id)) {
    clientIds = Array.from(new Set(raw.clientIds as string[]));
  } else return { ok: false, error: "Indica `clientIds` (lista) o \"all\"" };

  const value: BulkReminderInput = { clientIds, enabled: raw.enabled };
  if (raw.hour !== undefined) {
    if (typeof raw.hour !== "number" || !Number.isInteger(raw.hour) || raw.hour < 0 || raw.hour > 23) return { ok: false, error: "`hour` va de 0 a 23" };
    value.hour = raw.hour;
  }
  if (raw.minute !== undefined) {
    if (typeof raw.minute !== "number" || !Number.isInteger(raw.minute) || raw.minute < 0 || raw.minute > 59) return { ok: false, error: "`minute` va de 0 a 59" };
    value.minute = raw.minute;
  }
  if (raw.daysBefore !== undefined) value.daysBefore = parseReminderDaysBefore(raw.daysBefore, 1);
  return { ok: true, value };
}
