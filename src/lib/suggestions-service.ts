import { randomUUID } from "node:crypto";
import { completeWithAi, getAvailableAiModels, resolveRequestedModelId } from "@/src/lib/ai-completion";
import { listNvidiaModelIds } from "@/src/lib/ai-keys";
import { isNvidiaChatModelId, providerModelName, providerOfModelId } from "@/src/lib/ai-provider";
import { prisma } from "@/src/lib/db";
import { syncAppointmentToCalendar } from "@/src/lib/google-calendar";
import { utcToZonedParts } from "@/src/lib/manual-appointment";
import {
  SUGGESTIONS_SYSTEM_PROMPT,
  buildSuggestionsPrompt,
  describeAiError,
  extractSuggestionsJson,
  normalizeSuggestions,
  pickNotesForAi,
  planAcceptance,
  readStoredPayload,
} from "@/src/lib/meeting-suggestions";

type Failure = { ok: false; status: number; message: string };

const DEFAULT_TZ = "America/Cancun";
/**
 * Cuida el gasto de IA sin castigar los fallos: la espera solo corre desde la última generación que SÍ terminó
 * (un fallo se puede reintentar al momento) y una generación en curso bloquea a otra de la misma cita.
 */
const COOLDOWN_MS = 8_000;
const lastSuccess = new Map<string, number>();
const generating = new Set<string>();

/** Genera sugerencias con la IA a partir de las notas de la cita. No crea nada en el CRM: solo guarda propuestas pendientes. */
export async function generateSuggestions(
  organizationId: string,
  userId: string,
  appointmentId: string,
  requestedModelId?: string | null,
): Promise<{ ok: true; created: number; total: number } | Failure> {
  const appointment = await prisma.appointment.findFirst({
    where: { id: appointmentId, organizationId },
    select: { id: true, title: true, guestName: true, startTime: true, appointmentType: { select: { name: true } } },
  });
  if (!appointment) return { ok: false, status: 404, message: "Cita no encontrada" };

  // A la IA solo va el título, el origen y el resumen/texto de cada nota. El campo de notas privadas de Granola ni se
  // consulta. (El resumen que genera Granola puede reflejar lo que el dueño anotó: esa parte no se puede separar.)
  const notes = await prisma.granolaNote.findMany({
    where: { organizationId, appointmentId, summary: { not: null } },
    orderBy: { startedAt: "asc" },
    select: { title: true, source: true, summary: true },
  });
  const withText = pickNotesForAi(notes);
  if (!withText.length) return { ok: false, status: 422, message: "Esta cita aún no tiene notas: sincroniza Granola, escribe una nota o importa una página de Notion." };

  const known = await prisma.appointmentSuggestion.findMany({
    where: { organizationId, appointmentId },
    select: { type: true, title: true, status: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  // Un modelo elegido a mano debe estar entre los disponibles de la organización (no se acepta un id cualquiera).
  const chosenModelId = requestedModelId?.trim() || null;
  if (chosenModelId) {
    const available = await getAvailableAiModels(organizationId);
    let allowed = available.some((m) => m.id === chosenModelId);
    // Un modelo de NVIDIA vigente hoy en su lista también vale aunque no esté en el catálogo del CRM.
    if (!allowed && providerOfModelId(chosenModelId) === "nvidia") {
      const live = await listNvidiaModelIds(organizationId);
      const name = providerModelName(chosenModelId);
      allowed = Boolean(live?.includes(name)) && isNvidiaChatModelId(name);
    }
    if (!allowed) return { ok: false, status: 400, message: "Ese modelo de IA no está disponible. Elige otro de la lista." };
  }
  if (generating.has(appointmentId)) return { ok: false, status: 409, message: "Ya se están generando sugerencias para esta cita. Espera a que termine." };
  const recent = Math.max(lastSuccess.get(appointmentId) ?? 0, known[0]?.createdAt.getTime() ?? 0);
  const waitMs = COOLDOWN_MS - (Date.now() - recent);
  if (waitMs > 0) return { ok: false, status: 429, message: `Acabas de generar sugerencias: espera ${Math.ceil(waitMs / 1000)} s para volver a hacerlo.` };
  generating.add(appointmentId);
  try {
    return await runGeneration(appointment);
  } finally {
    generating.delete(appointmentId);
  }

  async function runGeneration(appt: NonNullable<typeof appointment>): Promise<{ ok: true; created: number; total: number } | Failure> {

  const org = await prisma.organization.findUnique({ where: { id: organizationId }, select: { timezone: true } });
  const timezone = org?.timezone || DEFAULT_TZ;
  const today = utcToZonedParts(new Date(), timezone).date;

  const prompt = buildSuggestionsPrompt({
    appointmentTitle: appt.title?.trim() || appt.appointmentType?.name || "Cita",
    guestName: appt.guestName,
    meetingDate: utcToZonedParts(appt.startTime, timezone).date,
    today,
    timezone,
    notes: withText,
    decided: known.map((k) => ({ type: k.type, title: k.title, status: k.status })),
  });

  let raw: string;
  try {
    const modelId = chosenModelId ?? (await resolveRequestedModelId(organizationId, userId, null));
    raw = await completeWithAi({ orgId: organizationId, modelId, systemPrompt: SUGGESTIONS_SYSTEM_PROMPT, userPrompt: prompt, maxTokens: 8000, maxOutputChars: 9000 });
  } catch (error) {
    // La causa real queda en el log del servidor; al usuario se le da una explicación entendible, sin texto del proveedor.
    console.error("[suggestions] fallo de la IA:", error instanceof Error ? error.message : error);
    const described = describeAiError(error instanceof Error ? error.message : null);
    return { ok: false, status: described.status, message: described.message };
  }

  const parsed = extractSuggestionsJson(raw);
  if (parsed === null) return { ok: false, status: 502, message: "La IA devolvió una respuesta que no se pudo leer. Intenta de nuevo." };
  const suggestions = normalizeSuggestions(parsed, today);

  // Lo ya agregado o descartado no se vuelve a proponer; las pendientes se conservan. La huella única evita duplicados.
  const created = suggestions.length
    ? await prisma.appointmentSuggestion.createMany({
        data: suggestions.map((s) => ({
          organizationId,
          appointmentId,
          type: s.type,
          title: s.title,
          detail: s.detail,
          payload: JSON.stringify(s.payload),
          fingerprint: s.fingerprint,
        })),
        skipDuplicates: true,
      })
    : { count: 0 };
  lastSuccess.set(appointmentId, Date.now());
  return { ok: true, created: created.count, total: suggestions.length };
  }
}

export async function listSuggestions(organizationId: string, appointmentId: string) {
  const rows = await prisma.appointmentSuggestion.findMany({
    where: { organizationId, appointmentId },
    orderBy: [{ createdAt: "asc" }],
    select: { id: true, type: true, title: true, detail: true, payload: true, status: true, resultType: true, resultId: true, createdAt: true },
  });
  const order = { PENDING: 0, ACCEPTED: 1, DISMISSED: 2 } as Record<string, number>;
  return rows
    .map((r) => ({ ...r, payload: readStoredPayload(r.payload) }))
    .sort((a, b) => (order[a.status] ?? 3) - (order[b.status] ?? 3));
}

class Conflict extends Error {}
class Invalid extends Error {}

/** Agrega una sugerencia al CRM (tarea, cita, contacto o recomendación). Se agrega una sola vez: el cierre es atómico. */
export async function acceptSuggestion(
  organizationId: string,
  userId: string,
  appointmentId: string,
  suggestionId: string,
): Promise<{ ok: true; resultType: string | null; resultId: string | null; message: string } | Failure> {
  const suggestion = await prisma.appointmentSuggestion.findFirst({ where: { id: suggestionId, organizationId, appointmentId } });
  if (!suggestion) return { ok: false, status: 404, message: "Sugerencia no encontrada" };
  const appointment = await prisma.appointment.findFirst({
    where: { id: appointmentId, organizationId },
    select: { id: true, contactId: true, dealId: true, guestName: true, guestEmail: true, guestPhone: true },
  });
  if (!appointment) return { ok: false, status: 404, message: "Cita no encontrada" };
  const org = await prisma.organization.findUnique({ where: { id: organizationId }, select: { timezone: true } });
  const timezone = org?.timezone || DEFAULT_TZ;
  const payload = readStoredPayload(suggestion.payload);
  const today = utcToZonedParts(new Date(), timezone).date;

  let calendarSync: Parameters<typeof syncAppointmentToCalendar>[1] | null = null;
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Cierre atómico: solo una petición pasa de PENDING a ACCEPTED; si la creación falla, todo se revierte.
      const claimed = await tx.appointmentSuggestion.updateMany({ where: { id: suggestion.id, organizationId, status: "PENDING" }, data: { status: "ACCEPTED", resolvedAt: new Date() } });
      if (claimed.count !== 1) throw new Conflict();

      let resultType: string | null = null;
      let resultId: string | null = null;
      let message = "Sugerencia agregada.";

      const plan = planAcceptance({ type: suggestion.type, title: suggestion.title, payload }, appointment, timezone, today);
      if (plan.kind === "INVALID") throw new Invalid(plan.message);

      if (plan.kind === "TASK") {
        const task = await tx.task.create({ data: { organizationId, assignedToId: userId, ...plan.data }, select: { id: true } });
        resultType = "Task";
        resultId = task.id;
        message = "Tarea creada.";
      } else if (plan.kind === "APPOINTMENT") {
        const created = await tx.appointment.create({
          data: { ...plan.data, organizationId, timezone, status: "CONFIRMED", cancelToken: randomUUID() },
          select: { id: true, startTime: true, endTime: true, guestName: true, guestEmail: true, notes: true },
        });
        calendarSync = { id: created.id, startTime: created.startTime, endTime: created.endTime, guestName: created.guestName, guestEmail: created.guestEmail, notes: created.notes, googleEventId: null, appointmentType: { name: plan.data.title ?? "Cita", location: null } };
        resultType = "Appointment";
        resultId = created.id;
        message = "Cita de seguimiento creada.";
      } else if (plan.kind === "CONTACT") {
        const existing = plan.data.email ? await tx.contact.findFirst({ where: { organizationId, email: plan.data.email }, select: { id: true } }) : null;
        if (existing) {
          // Sin duplicar: la sugerencia queda ligada al contacto que ya existía.
          resultType = "Contact";
          resultId = existing.id;
          message = "Ya existía un contacto con ese correo: no se duplicó, la sugerencia quedó ligada a él.";
        } else {
          const company = plan.data.company ? await tx.company.findFirst({ where: { organizationId, name: plan.data.company }, select: { id: true } }) : null;
          const contact = await tx.contact.create({
            data: { organizationId, firstName: plan.data.firstName, lastName: plan.data.lastName, email: plan.data.email, phone: plan.data.phone, source: "Reunión", companyId: company?.id ?? null },
            select: { id: true },
          });
          resultType = "Contact";
          resultId = contact.id;
          message = "Contacto creado.";
        }
      } else {
        message = "Recomendación marcada como aceptada.";
      }

      await tx.appointmentSuggestion.update({ where: { id: suggestion.id }, data: { resultType, resultId } });
      return { resultType, resultId, message };
    });

    // Google Calendar no debe hacer fallar la cita: ya está guardada.
    if (calendarSync) {
      const sync = calendarSync as Parameters<typeof syncAppointmentToCalendar>[1];
      syncAppointmentToCalendar(organizationId, sync)
        .then(async (eventId) => {
          if (eventId) await prisma.appointment.update({ where: { id: sync.id }, data: { googleEventId: eventId } });
        })
        .catch((error) => console.error("[suggestions] Google Calendar sync error:", error));
    }
    return { ok: true, ...result };
  } catch (error) {
    if (error instanceof Conflict) return { ok: false, status: 409, message: "Esta sugerencia ya se agregó o se descartó." };
    if (error instanceof Invalid) return { ok: false, status: 422, message: error.message };
    throw error;
  }
}

/** Descarta una sugerencia pendiente: deja de mostrarse y no vuelve a proponerse. */
export async function dismissSuggestion(organizationId: string, appointmentId: string, suggestionId: string): Promise<{ ok: true } | Failure> {
  const result = await prisma.appointmentSuggestion.updateMany({
    where: { id: suggestionId, organizationId, appointmentId, status: "PENDING" },
    data: { status: "DISMISSED", resolvedAt: new Date() },
  });
  if (result.count === 1) return { ok: true };
  const exists = await prisma.appointmentSuggestion.findFirst({ where: { id: suggestionId, organizationId, appointmentId }, select: { id: true } });
  return exists ? { ok: false, status: 409, message: "Esta sugerencia ya se agregó o se descartó." } : { ok: false, status: 404, message: "Sugerencia no encontrada" };
}
