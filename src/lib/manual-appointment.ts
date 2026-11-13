// Cita creada a mano: sin pasar por la disponibilidad ni la reserva pública. Funciones puras.

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME = /^(\d{1,2}):(\d{2})$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isKnownZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** Instante UTC de una fecha y hora «de pared» en la zona horaria dada (la de la organización). */
export function zonedDateTimeToUtc(date: string, time: string, timeZone: string): Date | null {
  const d = DATE.exec(date.trim());
  const t = TIME.exec(time.trim());
  if (!d || !t) return null;
  const [year, month, day, hour, minute] = [Number(d[1]), Number(d[2]), Number(d[3]), Number(t[1]), Number(t[2])];
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) return null;
  const wall = Date.UTC(year, month - 1, day, hour, minute);
  if (Number.isNaN(wall)) return null;
  const zone = isKnownZone(timeZone) ? timeZone : "UTC";
  // Desfase de la zona en ese instante: se calcula una vez y se corrige una segunda por si cruza un cambio de horario.
  const offsetAt = (instant: number) => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: zone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
    }).formatToParts(new Date(instant));
    const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
    return Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second")) - instant;
  };
  let instant = wall - offsetAt(wall);
  instant = wall - offsetAt(instant);
  return new Date(instant);
}

export type ManualAppointmentInput = {
  title?: string | null;
  date?: string | null;
  time?: string | null;
  durationMinutes?: number | null;
  guestName?: string | null;
  guestEmail?: string | null;
  guestPhone?: string | null;
  notes?: string | null;
};

export type ManualAppointment = {
  title: string | null;
  startTime: Date;
  endTime: Date;
  guestName: string;
  guestEmail: string;
  guestPhone: string | null;
  notes: string | null;
};

type Result = { ok: true; value: ManualAppointment } | { ok: false; error: string; value?: undefined };

const text = (value: string | null | undefined) => (typeof value === "string" ? value.trim() : "");

/** Duración por defecto de una cita sin tipo (apartada a mano): una hora. */
export const DEFAULT_BLOCK_MINUTES = 60;

/**
 * Valida el formulario de cita manual. Con tipo, la duración por defecto es la del tipo y el título es opcional.
 * Sin tipo (`type` null) la cita es un horario apartado: el título es obligatorio y ocupa una hora si no se indica otra.
 * Si no se indica a quién, el título hace de nombre.
 */
export function buildManualAppointment(input: ManualAppointmentInput, type: { duration: number } | null, timeZone: string): Result {
  const title = text(input.title);
  if (!type && !title) return { ok: false, error: "Escribe un título para la cita." };
  const guestName = text(input.guestName) || title;
  if (!guestName) return { ok: false, error: "El nombre de la persona es obligatorio." };
  const start = zonedDateTimeToUtc(text(input.date), text(input.time), timeZone);
  if (!start) return { ok: false, error: "Elige una fecha y una hora válidas." };
  const duration = input.durationMinutes ?? type?.duration ?? DEFAULT_BLOCK_MINUTES;
  if (!Number.isFinite(duration) || duration < 5 || duration > 24 * 60) {
    return { ok: false, error: "La duración debe estar entre 5 minutos y 24 horas." };
  }
  const guestEmail = text(input.guestEmail);
  if (guestEmail && !EMAIL.test(guestEmail)) return { ok: false, error: "El correo no es válido." };
  return {
    ok: true,
    value: {
      title: title || null,
      startTime: start,
      endTime: new Date(start.getTime() + Math.round(duration) * 60000),
      guestName,
      guestEmail,
      guestPhone: text(input.guestPhone) || null,
      notes: text(input.notes) || null,
    },
  };
}

/** Fecha «YYYY-MM-DD» y hora «HH:mm» de un instante UTC en la zona horaria dada (la inversa de `zonedDateTimeToUtc`). */
export function utcToZonedParts(instant: Date, timeZone: string): { date: string; time: string } {
  const zone = isKnownZone(timeZone) ? timeZone : "UTC";
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  }).formatToParts(instant);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}` };
}

/** Zona horaria pedida por el navegador si es válida; si no, la de reserva (la de la organización). */
export function resolveTimezone(candidate: unknown, fallback: string): string {
  return typeof candidate === "string" && candidate.trim() && isKnownZone(candidate.trim()) ? candidate.trim() : fallback;
}
