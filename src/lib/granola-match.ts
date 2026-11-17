import type { GranolaAttendee } from "./granola-parse";

/** Tolerancia entre el inicio de la sesión de Granola y el de la cita. */
export const MATCH_TOLERANCE_MINUTES = 15;

export type MatchableAppointment = {
  id: string;
  startTime: Date;
  guestEmail: string | null;
  contactEmail?: string | null;
};

const norm = (email: string | null | undefined) => (email ?? "").trim().toLowerCase();

/**
 * Cita a la que pertenece una sesión: debe coincidir el horario (con tolerancia) y al menos un correo de los asistentes
 * con el del invitado o el del contacto de la cita. Devuelve el id solo si hay exactamente una candidata;
 * con cero o varias, `null` (la sesión queda sin asignar para vincularla a mano).
 */
export function matchNoteToAppointment(
  note: { startedAt: Date | null; attendees: GranolaAttendee[] },
  appointments: MatchableAppointment[],
  toleranceMinutes = MATCH_TOLERANCE_MINUTES,
): string | null {
  if (!note.startedAt) return null;
  const emails = new Set(note.attendees.map((a) => norm(a.email)).filter(Boolean));
  if (emails.size === 0) return null;
  const limit = toleranceMinutes * 60_000;
  const candidates = appointments.filter((appt) => {
    if (Math.abs(appt.startTime.getTime() - note.startedAt!.getTime()) > limit) return false;
    const guest = norm(appt.guestEmail);
    const contact = norm(appt.contactEmail);
    return (guest && emails.has(guest)) || (contact && emails.has(contact));
  });
  return candidates.length === 1 ? candidates[0].id : null;
}

export type StoredItem = { id: string; text: string; taskId: string | null };

const key = (text: string) => text.trim().toLowerCase().replace(/\s+/g, " ");

/**
 * Mezcla los pasos recién detectados con los ya guardados cuando Granola actualiza el resumen:
 * los ya convertidos en tarea nunca se pierden; los pendientes que ya no aparecen se quitan;
 * los nuevos se agregan. Devuelve qué crear y qué borrar.
 */
export function mergeActionItems(
  stored: StoredItem[],
  detected: string[],
): { create: string[]; removeIds: string[] } {
  const detectedKeys = new Set(detected.map(key));
  const storedKeys = new Set(stored.map((item) => key(item.text)));
  const removeIds = stored.filter((item) => !item.taskId && !detectedKeys.has(key(item.text))).map((item) => item.id);
  const create = detected.filter((text) => !storedKeys.has(key(text)));
  return { create, removeIds };
}
