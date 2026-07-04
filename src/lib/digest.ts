import { prisma } from "@/src/lib/db";
import { sendWhatsAppNotification } from "@/src/lib/whatsapp";
import { listGoogleCalendarEvents } from "@/src/lib/google-calendar";
import { completeWithAi } from "@/src/lib/ai-completion";
import { DEFAULT_MODEL_ID } from "@/src/lib/ai-models";

export type DigestFrequency = "daily" | "weekly" | "monthly" | "custom";

export type DigestScheduleConfig = {
  enabled: boolean;
  frequency: DigestFrequency;
  customDays: number[];
  weeklyDay: number;
  monthlyDay: number;
  hour: number;
  minute: number;
};

type ZonedParts = {
  year: number;
  month: number;
  day: number;
  weekday: number;
  hour: number;
  minute: number;
};

function getZonedParts(date: Date, timezone: string): ZonedParts {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "0";
  const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    year: parseInt(get("year"), 10),
    month: parseInt(get("month"), 10),
    day: parseInt(get("day"), 10),
    weekday: weekdayMap[get("weekday")] ?? 0,
    hour: parseInt(get("hour"), 10) % 24,
    minute: parseInt(get("minute"), 10),
  };
}

export function isDigestDue(
  schedule: DigestScheduleConfig & { lastSentAt?: Date | null },
  timezone: string,
  now = new Date(),
  windowMinutes = 15
): boolean {
  if (!schedule.enabled) return false;

  const z = getZonedParts(now, timezone);
  const scheduledMins = schedule.hour * 60 + schedule.minute;
  const currentMins = z.hour * 60 + z.minute;
  if (currentMins < scheduledMins || currentMins >= scheduledMins + windowMinutes) return false;

  if (schedule.lastSentAt) {
    const last = getZonedParts(schedule.lastSentAt, timezone);
    if (last.year === z.year && last.month === z.month && last.day === z.day) return false;
  }

  switch (schedule.frequency) {
    case "daily":
      return true;
    case "weekly":
      return z.weekday === schedule.weeklyDay;
    case "monthly":
      return z.day === schedule.monthlyDay;
    case "custom":
      return schedule.customDays.includes(z.weekday);
    default:
      return false;
  }
}

export async function buildDigestContext(
  orgId: string,
  userId: string,
  options?: { includeGoogleCalendar?: boolean }
): Promise<string> {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const todayDay = now.getDate();

  const [
    pipelines,
    openDeals,
    overdueFollowUps,
    clients,
    pendingPayments,
    todayTasks,
    overdueTasks,
    upcomingAppointments,
  ] = await Promise.all([
    prisma.pipeline.findMany({
      where: { organizationId: orgId },
      select: { id: true, name: true },
    }),
    prisma.deal.findMany({
      where: { organizationId: orgId, stage: { isWon: false, isLost: false } },
      select: {
        id: true, title: true, value: true, currency: true, followUpAt: true,
        stage: { select: { name: true, pipeline: { select: { id: true, name: true } } } },
        contact: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.deal.count({
      where: {
        organizationId: orgId,
        followUpAt: { lt: now },
        stage: { isWon: false, isLost: false },
      },
    }),
    prisma.client.findMany({
      where: { organizationId: orgId, isActive: true },
      select: { id: true, name: true, monthlyFee: true, currency: true, billingDay: true },
    }),
    prisma.clientPayment.findMany({
      where: {
        organizationId: orgId,
        month: currentMonth,
        year: currentYear,
        status: "PENDIENTE",
      },
      include: { client: { select: { name: true, currency: true } } },
    }),
    prisma.task.findMany({
      where: {
        organizationId: orgId,
        assignedToId: userId,
        isCompleted: false,
        dueDate: { gte: todayStart, lte: todayEnd },
      },
      take: 10,
      select: { title: true, dueDate: true },
    }),
    prisma.task.count({
      where: { organizationId: orgId, assignedToId: userId, isCompleted: false, dueDate: { lt: todayStart } },
    }),
    prisma.appointment.findMany({
      where: { organizationId: orgId, startTime: { gte: new Date(), lte: in7Days } },
      orderBy: { startTime: "asc" },
      take: 5,
      select: {
        startTime: true,
        appointmentType: { select: { name: true } },
        contact: { select: { firstName: true, lastName: true } },
      },
    }),
  ]);

  const mrrUSD = clients.filter((c) => c.currency === "USD").reduce((s, c) => s + c.monthlyFee, 0);
  const mrrMXN = clients.filter((c) => c.currency === "MXN").reduce((s, c) => s + c.monthlyFee, 0);
  const pipelineUSD = openDeals.filter((d) => d.currency !== "MXN").reduce((s, d) => s + (d.value ?? 0), 0);
  const pipelineMXN = openDeals.filter((d) => d.currency === "MXN").reduce((s, d) => s + (d.value ?? 0), 0);

  const upcomingBillings = clients.filter((c) => {
    const diff = c.billingDay >= todayDay ? c.billingDay - todayDay : 28 - todayDay + c.billingDay;
    return diff >= 0 && diff <= 7;
  });

  const fmt = (d: Date) =>
    d.toLocaleDateString("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

  const lines = [
    `FECHA: ${new Date().toLocaleString("es-MX")}`,
    ``,
    `PIPELINES ACTIVOS: ${pipelines.length}`,
    ...pipelines.map((p) => {
      const deals = openDeals.filter((d) => d.stage.pipeline?.id === p.id);
      const usd = deals.filter((d) => d.currency !== "MXN").reduce((s, d) => s + (d.value ?? 0), 0);
      const mxn = deals.filter((d) => d.currency === "MXN").reduce((s, d) => s + (d.value ?? 0), 0);
      return `  - ${p.name}: ${deals.length} deals | USD $${usd.toLocaleString()} | MXN $${mxn.toLocaleString()}`;
    }),
    ``,
    `DEALS ABIERTOS: ${openDeals.length} | Valor USD $${pipelineUSD.toLocaleString()} | MXN $${pipelineMXN.toLocaleString()}`,
    `SEGUIMIENTOS VENCIDOS: ${overdueFollowUps}`,
    ...openDeals.slice(0, 8).map((d) => {
      const contact = d.contact ? `${d.contact.firstName} ${d.contact.lastName ?? ""}`.trim() : "sin contacto";
      const fu = d.followUpAt ? ` | seguimiento: ${fmt(d.followUpAt)}` : "";
      return `  - "${d.title}" | ${d.stage.name} | $${d.value ?? 0} ${d.currency} | ${contact}${fu}`;
    }),
    ``,
    `CLIENTES ACTIVOS: ${clients.length}`,
    `MRR USD: $${mrrUSD.toLocaleString()} | MRR MXN: $${mrrMXN.toLocaleString()}`,
    `PAGOS PENDIENTES ESTE MES: ${pendingPayments.length}`,
    ...pendingPayments.slice(0, 8).map((p) =>
      `  - ${p.client.name}: $${p.amount} ${p.client.currency} (${p.status})`
    ),
    `COBROS PRÓXIMOS (7 días): ${upcomingBillings.length}`,
    ...upcomingBillings.map((c) =>
      `  - ${c.name}: día ${c.billingDay} | $${c.monthlyFee} ${c.currency}`
    ),
    ``,
    `TAREAS VENCIDAS: ${overdueTasks}`,
    `TAREAS HOY: ${todayTasks.length}`,
    ...todayTasks.map((t) => `  - ${t.title}`),
    ``,
    `CITAS PRÓXIMAS (7 días): ${upcomingAppointments.length}`,
    ...upcomingAppointments.map((a) => {
      const who = a.contact ? `${a.contact.firstName} ${a.contact.lastName ?? ""}`.trim() : "";
      return `  - ${fmt(a.startTime)} | ${a.appointmentType?.name ?? "Cita"} | ${who}`;
    }),
  ];

  if (options?.includeGoogleCalendar !== false) {
    const calendarEvents = await listGoogleCalendarEvents(orgId, now, in7Days);
    lines.push(
      ``,
      `EVENTOS GOOGLE CALENDAR (7 días): ${calendarEvents.length}`,
      ...calendarEvents.slice(0, 10).map((e) => {
        const loc = e.location ? ` | ${e.location}` : "";
        return `  - ${fmt(e.start)} | ${e.summary}${loc}`;
      })
    );
    if (calendarEvents.length === 0) {
      lines.push(`  (Sin eventos o Google Calendar no conectado)`);
    }
  }

  return lines.join("\n");
}

export async function generateDigestMessage(
  context: string,
  options: { orgId: string; modelId?: string }
): Promise<string> {
  const systemPrompt = `Eres un asistente de CRM. Genera un resumen ejecutivo en español para enviar por WhatsApp.
Reglas:
- Máximo 1200 caracteres
- Usa emojis con moderación (2-4 en total)
- Secciones cortas con títulos en mayúsculas
- Incluye: pipelines, deals pendientes/vencidos, ventas y pagos pendientes, ingresos MRR, cobros próximos, tareas, citas del CRM y eventos de Google Calendar si aparecen en los datos
- Sé conciso y accionable
- NO uses markdown ni asteriscos
- Solo el texto del mensaje, sin introducción`;

  return completeWithAi({
    orgId: options.orgId,
    modelId: options.modelId?.trim() || DEFAULT_MODEL_ID,
    systemPrompt,
    userPrompt: `Datos del CRM:\n\n${context}\n\nGenera el resumen para WhatsApp.`,
    maxTokens: 600,
  });
}

export async function runDigestForUser(
  userId: string,
  orgId: string,
  options?: { sendWhatsApp?: boolean; skipScheduleCheck?: boolean }
): Promise<{ message: string; sent: boolean; context: string }> {
  const [schedule, user, org] = await Promise.all([
    prisma.digestSchedule.findUnique({
      where: { userId_organizationId: { userId, organizationId: orgId } },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      include: { callMeBot: true },
    }),
    prisma.organization.findUnique({ where: { id: orgId }, select: { timezone: true, name: true } }),
  ]);

  if (!org) throw new Error("Organización no encontrada");

  const config: DigestScheduleConfig & { lastSentAt?: Date | null } = schedule
    ? {
        enabled: schedule.enabled,
        frequency: schedule.frequency as DigestFrequency,
        customDays: schedule.customDays ? JSON.parse(schedule.customDays) : [],
        weeklyDay: schedule.weeklyDay,
        monthlyDay: schedule.monthlyDay,
        hour: schedule.hour,
        minute: schedule.minute,
        lastSentAt: schedule.lastSentAt,
      }
    : {
        enabled: true,
        frequency: "daily",
        customDays: [],
        weeklyDay: 1,
        monthlyDay: 1,
        hour: 8,
        minute: 0,
      };

  if (!options?.skipScheduleCheck && !isDigestDue(config, org.timezone)) {
    throw new Error("Fuera de ventana de envío programado");
  }

  const includeGoogleCalendar = schedule?.includeGoogleCalendar ?? true;
  const aiModelId = schedule?.aiModelId ?? DEFAULT_MODEL_ID;
  const context = await buildDigestContext(orgId, userId, { includeGoogleCalendar });
  const message = await generateDigestMessage(context, { orgId, modelId: aiModelId });

  let sent = false;
  const shouldSend = options?.sendWhatsApp !== false;
  if (shouldSend) {
    if (!user?.callMeBot?.phone || !user.callMeBot.apiKey) {
      throw new Error("Configura WhatsApp (CallMeBot) en Configuración");
    }
    const header = `📊 Resumen Noxy — ${org.name}\n\n`;
    sent = await sendWhatsAppNotification(
      user.callMeBot.phone,
      user.callMeBot.apiKey,
      header + message
    );
    if (!sent) throw new Error("No se pudo enviar el WhatsApp");
  }

  if (schedule && shouldSend) {
    await prisma.digestSchedule.update({
      where: { id: schedule.id },
      data: { lastSentAt: new Date() },
    });
  }

  return { message, sent, context };
}

export function parseCustomDays(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((d) => typeof d === "number" && d >= 0 && d <= 6);
}
