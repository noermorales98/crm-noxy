import { completeWithAi, resolveRequestedModelId } from "@/src/lib/ai-completion";
import { listNvidiaModelIds, resolveProviderKeys } from "@/src/lib/ai-keys";
import { fallbackCandidates } from "@/src/lib/ai-provider";
import { buildPageRecordContext } from "@/src/lib/ai-context-modules";
import { prisma } from "@/src/lib/db";
import { normalizeDraft } from "@/src/lib/email-drafts";
import { loadMcpAccess } from "@/src/lib/mcp/org-access";
import { FOLLOWUP_SYSTEM_PROMPT, parseFollowupJson, pickFollowupCompany, shouldDraftFollowup } from "@/src/lib/followup-draft";

const WINDOW_MS = 3 * 86_400_000; // solo citas de los últimos 3 días: no se llena de borradores viejos

/** Citas recientes con notas y sin borrador de seguimiento (para no perder las que no alcanzaron en una ejecución). */
export async function pendingFollowupAppointmentIds(organizationId: string, limit = 3): Promise<string[]> {
  const now = new Date();
  const rows = await prisma.appointment.findMany({
    where: {
      organizationId,
      followupDraftedAt: null,
      status: { not: "CANCELLED" },
      startTime: { gte: new Date(now.getTime() - WINDOW_MS), lte: now },
      granolaNotes: { some: { summary: { not: null } } },
    },
    orderBy: { startTime: "desc" },
    take: limit,
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

export type FollowupResult = "drafted" | "skipped" | "failed";

/**
 * Redacta el correo de seguimiento de una cita con notas y lo guarda como BORRADOR (nunca lo envía), desde Noxy Digital,
 * con una tarea para revisarlo. Una sola vez por cita; si la IA falla se libera para reintentar en el siguiente ciclo.
 */
export async function autoDraftFollowup(organizationId: string, appointmentId: string): Promise<FollowupResult> {
  const appt = await prisma.appointment.findFirst({
    where: { id: appointmentId, organizationId },
    select: {
      id: true, status: true, followupDraftedAt: true, guestName: true, guestEmail: true, contactId: true, dealId: true,
      contact: { select: { firstName: true, lastName: true, email: true } },
      granolaNotes: { select: { summary: true, privateNotes: true } },
    },
  });
  if (!appt) return "skipped";
  const notesText = appt.granolaNotes.map((n) => `${n.summary ?? ""}${n.privateNotes ?? ""}`).join("").trim();
  const person = appt.contact ? `${appt.contact.firstName} ${appt.contact.lastName ?? ""}`.trim() : appt.guestName?.trim();
  if (!shouldDraftFollowup({ status: appt.status, followupDraftedAt: appt.followupDraftedAt, notesText, hasPerson: Boolean(person) })) return "skipped";

  const companies = await prisma.company.findMany({ where: { organizationId }, select: { id: true, name: true, smtpHost: true, smtpFromEmail: true, smtpUser: true } });
  const company = pickFollowupCompany(companies);
  if (!company) return "skipped";

  // Reclamo atómico: solo una ejecución redacta este seguimiento.
  const claimed = await prisma.appointment.updateMany({ where: { id: appt.id, organizationId, followupDraftedAt: null }, data: { followupDraftedAt: new Date() } });
  if (claimed.count !== 1) return "skipped";
  const release = () => prisma.appointment.updateMany({ where: { id: appt.id }, data: { followupDraftedAt: null } }).catch(() => {});

  try {
    const record = await buildPageRecordContext(organizationId, { page: "appointment", id: appt.id });
    const primary = await resolveRequestedModelId(organizationId, "", null);
    const hasNvidiaKey = (await resolveProviderKeys(organizationId, "nvidia")).keys.length > 0;
    const candidates = [primary, ...(hasNvidiaKey ? fallbackCandidates(primary, await listNvidiaModelIds(organizationId)) : [])];

    let parsed: { subject: string; body: string } | null = null;
    for (const modelId of candidates) {
      try {
        const raw = await completeWithAi({ orgId: organizationId, modelId, systemPrompt: FOLLOWUP_SYSTEM_PROMPT, userPrompt: `Contexto de la cita:\n${record}\n\nRedacta el correo de seguimiento.`, maxTokens: 3000, maxOutputChars: 6000 });
        parsed = parseFollowupJson(raw);
        if (parsed) break;
      } catch (error) {
        console.warn("[followup] fallo de la IA:", error instanceof Error ? error.message.slice(0, 120) : "error");
      }
    }
    if (!parsed) { await release(); return "failed"; }

    const to = appt.guestEmail?.trim() || appt.contact?.email?.trim() || "";
    const draft = normalizeDraft({ to, subject: parsed.subject, body: parsed.body });
    if (!draft.ok) { await release(); return "failed"; }
    await prisma.email.create({
      data: { ...draft.data, type: "DRAFT", isRead: false, fromAddress: company.smtpFromEmail || company.smtpUser || "", fromName: company.name, companyId: company.id, organizationId },
    });

    // Aviso: una tarea para revisar y enviar (el correo nunca sale solo).
    const operator = (await loadMcpAccess(organizationId)).operatorUserId;
    if (operator) {
      await prisma.task.create({
        data: {
          title: `Revisar y enviar el seguimiento a ${person}`,
          description: to ? "Borrador listo en Correo → Borradores." : "Borrador listo en Correo → Borradores. Falta el correo de la persona: agrégalo antes de enviar.",
          dueDate: new Date(Date.now() + 86_400_000),
          organizationId,
          assignedToId: operator,
          contactId: appt.contactId,
          dealId: appt.dealId,
        },
      });
    }
    return "drafted";
  } catch (error) {
    console.warn("[followup] no se pudo crear el seguimiento:", error instanceof Error ? error.name : "error");
    await release();
    return "failed";
  }
}

/** Uno por uno y con tope por ejecución (cada redacción tarda segundos); el resto sigue pendiente para el siguiente ciclo. */
export async function autoDraftFollowups(organizationId: string, appointmentIds: string[], max = 1): Promise<void> {
  const pending = await pendingFollowupAppointmentIds(organizationId, 3);
  for (const id of Array.from(new Set([...appointmentIds, ...pending])).slice(0, max)) await autoDraftFollowup(organizationId, id);
}
