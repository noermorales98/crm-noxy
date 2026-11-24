import { prisma } from "@/src/lib/db";
import { completeWithAi } from "@/src/lib/ai-completion";
import { getAiPrefs } from "@/src/lib/ai-keys";
import { DEFAULT_MODEL_ID } from "@/src/lib/ai-models";
import { buildCrmContext } from "@/src/lib/ai-context";
import { buildModulesContext } from "@/src/lib/ai-context-modules";
import { sendWhatsAppNotification } from "@/src/lib/whatsapp";
import { alertMessage, isScheduleDue, lateContentLines, overduePaymentLines, staleDealLines, type AiSchedule } from "@/src/lib/ai-schedules";
import { buildMonthlyReports } from "@/src/lib/client-report-service";
import { monthLabel, previousMonth } from "@/src/lib/client-report";
import { listAllScheduleRows, listSchedules, saveSchedules } from "@/src/lib/ai-schedules-store";

const SYSTEM = "Eres el asistente del CRM Noxy. Responde en español, directo y con datos concretos del contexto. No inventes cifras.";

/** Texto que produce una programación ahora; vacío si es una alerta sin novedades. */
export async function produceScheduleText(s: AiSchedule, organizationId: string, now = new Date()): Promise<string> {
  if (s.kind === "prompt") {
    const [base, modules, prefs] = await Promise.all([buildCrmContext(s.userId, organizationId), buildModulesContext(organizationId).catch(() => ""), getAiPrefs(organizationId)]);
    return completeWithAi({
      orgId: organizationId,
      modelId: prefs.defaultModelId ?? DEFAULT_MODEL_ID,
      systemPrompt: `${SYSTEM}\n\n${base}\n\n${modules}`.slice(0, 16000),
      userPrompt: s.prompt,
      maxTokens: 900,
      maxOutputChars: 3500,
    });
  }
  if (s.kind === "client_reports") {
    const period = previousMonth(now);
    const reports = await buildMonthlyReports(organizationId, period);
    if (!reports.length) return "";
    return `Informes de ${monthLabel(period)} listos en Docs (${reports.length}):\n${reports.map((r) => `• ${r.clientName} — /kb/${r.docId}`).join("\n")}`;
  }
  if (s.kind === "stale_deals") {
    const deals = await prisma.deal.findMany({
      where: { organizationId, isArchived: false, stage: { isWon: false, isLost: false } },
      select: { title: true, value: true, updatedAt: true, stage: { select: { name: true } } },
      take: 300,
    });
    return alertMessage("stale_deals", staleDealLines(deals.map((d) => ({ title: d.title, updatedAt: d.updatedAt, stageName: d.stage.name, value: d.value })), s.days, now));
  }
  if (s.kind === "late_content") {
    const items = await prisma.contentItem.findMany({
      where: { organizationId, date: { lt: now }, publishStatus: { notIn: ["subido", "aprobado"] } },
      select: { title: true, date: true, publishStatus: true, client: { select: { name: true } } },
      take: 300,
    });
    return alertMessage("late_content", lateContentLines(items.map((i) => ({ title: i.title, date: i.date, clientName: i.client.name, publishStatus: i.publishStatus })), s.days, now));
  }
  const payments = await prisma.clientPayment.findMany({
    where: { organizationId, status: "PENDIENTE", dueDate: { lt: now } },
    select: { amount: true, currency: true, dueDate: true, month: true, year: true, client: { select: { name: true } } },
    take: 300,
  });
  return alertMessage("overdue_payments", overduePaymentLines(payments.map((p) => ({ clientName: p.client.name, amount: p.amount, currency: p.currency, dueDate: p.dueDate, month: p.month, year: p.year })), s.days, now));
}

/** Entrega: un chat nuevo en el asistente (visible en el sidebar) y, si la persona tiene WhatsApp configurado, un mensaje. */
async function deliver(s: AiSchedule, organizationId: string, text: string, now: Date): Promise<void> {
  const when = now.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
  await prisma.aiConversation.create({
    data: {
      userId: s.userId,
      organizationId,
      title: `⏰ ${s.name} · ${when}`.slice(0, 60),
      messages: { create: [{ role: "user", content: s.kind === "prompt" ? s.prompt : `Alerta programada: ${s.name}` }, { role: "assistant", content: text }] },
    },
  });
  const bot = await prisma.callMeBot.findUnique({ where: { userId: s.userId }, select: { phone: true, apiKey: true } }).catch(() => null);
  if (bot?.phone && bot.apiKey) await sendWhatsAppNotification(bot.phone, bot.apiKey, `⏰ ${s.name}\n\n${text}`.slice(0, 1500)).catch(() => {});
}

/** Ejecuta una programación y devuelve la versión con su último resultado. Nunca lanza: un fallo queda anotado. */
export async function runSchedule(s: AiSchedule, organizationId: string, now = new Date()): Promise<AiSchedule> {
  try {
    const text = (await produceScheduleText(s, organizationId, now)).trim();
    if (!text) return { ...s, lastRunAt: now.toISOString(), lastResult: "Sin novedades." };
    await deliver(s, organizationId, text, now);
    return { ...s, lastRunAt: now.toISOString(), lastResult: text };
  } catch (error) {
    console.error("[ai-schedules] falló", s.id, error instanceof Error ? error.name : "error");
    return { ...s, lastRunAt: now.toISOString(), lastResult: `No se pudo ejecutar: ${error instanceof Error ? error.message : "error"}`.slice(0, 300) };
  }
}

/** Para el cron: ejecuta las que toca ahora, en todas las organizaciones. */
export async function runDueAiSchedules(now = new Date()): Promise<{ checked: number; ran: number }> {
  let checked = 0;
  let ran = 0;
  for (const { organizationId, schedules } of await listAllScheduleRows()) {
    if (!schedules.length) continue;
    const org = await prisma.organization.findUnique({ where: { id: organizationId }, select: { timezone: true } });
    const timezone = org?.timezone || "UTC";
    let changed = false;
    const next: AiSchedule[] = [];
    for (const s of schedules) {
      checked++;
      if (isScheduleDue(s, timezone, now)) {
        next.push(await runSchedule(s, organizationId, now));
        ran++;
        changed = true;
      } else next.push(s);
    }
    if (changed) {
      // Se vuelve a leer: si alguien editó mientras tanto, solo se actualiza el estado de las que corrieron.
      const fresh = await listSchedules(organizationId);
      const byId = new Map(next.map((s) => [s.id, s]));
      await saveSchedules(organizationId, fresh.map((f) => (byId.get(f.id) && byId.get(f.id)!.lastRunAt !== f.lastRunAt ? { ...f, lastRunAt: byId.get(f.id)!.lastRunAt, lastResult: byId.get(f.id)!.lastResult } : f)));
    }
  }
  return { checked, ran };
}
