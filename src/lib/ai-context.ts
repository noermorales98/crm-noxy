import { ACTIVE_DEALS } from "@/src/lib/deal-filters";
import { prisma } from "@/src/lib/db";
import { visibleContactWhere } from "@/src/lib/visible-contacts";
import { loadMonthMetrics } from "@/src/lib/month-metrics";
import { monthKeyInZone } from "@/src/lib/month-close";

export async function buildCrmContext(userId: string, orgId: string): Promise<string> {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  const [
    totalContacts,
    newContactsWeek,
    newContactsMonth,
    recentContacts,
    totalCompanies,
    recentCompanies,
    activeDeals,
    pipelines,
    pendingTasks,
    overdueTasks,
    todayTasks,
    upcomingAppointments,
    orgRow,
  ] = await Promise.all([
    prisma.contact.count({ where: { organizationId: orgId, ...visibleContactWhere } }),
    prisma.contact.count({ where: { organizationId: orgId, createdAt: { gte: startOfWeek }, ...visibleContactWhere } }),
    prisma.contact.count({ where: { organizationId: orgId, createdAt: { gte: startOfMonth }, ...visibleContactWhere } }),
    prisma.contact.findMany({
      where: { organizationId: orgId, ...visibleContactWhere },
      orderBy: { createdAt: "desc" },
      take: 15,
      select: {
        id: true, firstName: true, lastName: true, email: true, phone: true,
        createdAt: true, source: true,
        company: { select: { name: true } },
      },
    }),
    prisma.company.count({ where: { organizationId: orgId } }),
    prisma.company.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, name: true, industry: true, website: true, createdAt: true },
    }),
    prisma.deal.findMany({
      where: { organizationId: orgId, ...ACTIVE_DEALS },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true, title: true, value: true, currency: true, createdAt: true, followUpAt: true, notes: true, wonAt: true, lostReason: true,
        quotes: { select: { folio: true, status: true } },
        stage: { select: { id: true, name: true, isWon: true, isLost: true } },
        contact: { select: { firstName: true, lastName: true, email: true } },
        company: { select: { name: true } },
      },
    }),
    prisma.pipeline.findMany({
      where: { organizationId: orgId },
      select: {
        id: true, name: true,
        stages: { select: { id: true, name: true, order: true }, orderBy: { order: "asc" } },
      },
    }),
    prisma.task.count({
      where: { organizationId: orgId, assignedToId: userId, isCompleted: false },
    }),
    prisma.task.count({
      where: {
        organizationId: orgId, assignedToId: userId,
        isCompleted: false, dueDate: { lt: now },
      },
    }),
    prisma.task.findMany({
      where: {
        organizationId: orgId, assignedToId: userId,
        isCompleted: false,
        dueDate: { gte: todayStart, lte: todayEnd },
      },
      take: 10,
      select: {
        id: true, title: true, dueDate: true,
        contact: { select: { firstName: true, lastName: true } },
        deal: { select: { title: true } },
      },
    }),
    prisma.appointment.findMany({
      where: { organizationId: orgId, startTime: { gte: now } },
      orderBy: { startTime: "asc" },
      take: 5,
      select: {
        id: true, startTime: true, endTime: true, status: true,
        appointmentType: { select: { name: true } },
        contact: { select: { firstName: true, lastName: true, email: true } },
      },
    }),
    prisma.organization.findUnique({ where: { id: orgId }, select: { timezone: true } }),
  ]);

  // Cierre del mes en curso: ganadas, perdidas (en el mes en que se perdieron), tasa, cobros y lo que sigue a mitad de proceso.
  const timeZone = orgRow?.timezone || "America/Cancun";
  const monthKey = monthKeyInZone(now, timeZone);
  const closing = await loadMonthMetrics(orgId, monthKey).catch(() => null);
  const sales = (n: number) => `${n} ${n === 1 ? "venta" : "ventas"}`;
  const money = (bucket: Record<string, number>) => Object.entries(bucket).map(([cur, n]) => `$${n.toLocaleString("es-MX")} ${cur}`).join(" · ") || "—";

  const fmt = (d: Date) => d.toLocaleDateString("es-MX", { weekday: "short", year: "numeric", month: "short", day: "numeric" });
  const fmtDt = (d: Date) => d.toLocaleString("es-MX", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  const wonDeals = activeDeals.filter(d => d.stage.isWon);
  const lostDeals = activeDeals.filter(d => d.stage.isLost);
  const openDeals = activeDeals.filter(d => !d.stage.isWon && !d.stage.isLost);
  const totalOpenValue = openDeals.reduce((s, d) => s + (d.value || 0), 0);
  const overdueFollowUps = openDeals.filter(d => d.followUpAt && d.followUpAt < now);

  const lines: string[] = [
    `Eres el asistente de IA del CRM Noxy. Tienes acceso COMPLETO a los datos reales de la organización. Responde siempre en español usando estos datos concretos.`,
    ``,
    `FECHA Y HORA ACTUAL: ${fmtDt(now)}`,
    ``,
    `═══════════════════════════════════════`,
    `CONTACTOS`,
    `═══════════════════════════════════════`,
    `• Total: ${totalContacts}`,
    `• Nuevos esta semana (desde ${fmt(startOfWeek)}): ${newContactsWeek}`,
    `• Nuevos este mes: ${newContactsMonth}`,
    ``,
    `Últimos ${recentContacts.length} contactos (con id para acciones):`,
    ...recentContacts.map(c =>
      `  - [id:${c.id}] ${c.firstName} ${c.lastName ?? ""} | ${c.email ?? "sin email"} | ${c.company?.name ?? "sin empresa"} | agregado ${fmt(c.createdAt)}${c.source ? ` | fuente: ${c.source}` : ""}`
    ),
    ``,
    `═══════════════════════════════════════`,
    `EMPRESAS`,
    `═══════════════════════════════════════`,
    `• Total: ${totalCompanies}`,
    ``,
    `Últimas ${recentCompanies.length} empresas:`,
    ...recentCompanies.map(c =>
      `  - ${c.name}${c.industry ? ` | ${c.industry}` : ""}${c.website ? ` | ${c.website}` : ""} | creada ${fmt(c.createdAt)}`
    ),
    ``,
    `═══════════════════════════════════════`,
    `VENTAS (PIPELINE)`,
    `═══════════════════════════════════════`,
    `• Deals abiertos: ${openDeals.length} (valor total: $${totalOpenValue.toLocaleString("es-MX")})`,
    `• Ganados: ${wonDeals.length} | Perdidos: ${lostDeals.length}`,
    `• Seguimientos vencidos: ${overdueFollowUps.length}`,
    ...(closing?.ok && closing.metrics
      ? [
          `• Cierre de ${monthKey} (mes en curso): ${sales(closing.metrics.won.count)} ganada${closing.metrics.won.count === 1 ? "" : "s"} (${money(closing.metrics.won.byCurrency)}), ${closing.metrics.lost.count} perdida${closing.metrics.lost.count === 1 ? "" : "s"}, tasa de cierre ${closing.metrics.closingRate ?? "—"}${closing.metrics.closingRate === null ? "" : "%"}, cobros recibidos ${money(closing.metrics.paymentsReceived)} (incluye pagos de cotizaciones).`,
          ...(closing.inProgress?.count
            ? [`• De esas ventas ganadas, ${closing.inProgress.count} ${closing.inProgress.count === 1 ? "sigue" : "siguen"} a mitad de proceso (${money(closing.inProgress.byCurrency)}): ${closing.inProgress.deals.map((d) => `"${d.title}" (${d.reason})`).join("; ")}. Cuando hables de ventas ganadas, aclara cuáles siguen en proceso.`]
            : []),
        ]
      : []),
    ``,
    `Deals recientes (con id y stageId para acciones):`,
    ...activeDeals.map(d => {
      const contact = d.contact ? `${d.contact.firstName} ${d.contact.lastName ?? ""}`.trim() : "sin contacto";
      const co = d.company?.name ?? "";
      const followUp = d.followUpAt ? ` | seguimiento: ${fmt(d.followUpAt)}` : "";
      const status = d.stage.isWon ? `GANADO (${d.stage.name})${d.wonAt ? ` el ${fmt(d.wonAt)}` : ""}` : d.stage.isLost ? "PERDIDO" : d.stage.name;
      const lost = d.stage.isLost ? ` | motivo de pérdida: ${d.lostReason ?? "sin registrar"}` : "";
      const quotes = d.quotes.length ? ` | cotizaciones: ${d.quotes.map((q) => `${q.folio} ${q.status}`).join(", ")}` : "";
      return `  - [id:${d.id}] "${d.title}" | $${(d.value || 0).toLocaleString()} ${d.currency} | etapa: ${status} [stageId:${d.stage.id}] | ${contact}${co ? ` / ${co}` : ""}${followUp}${lost}${quotes}`;
    }),
    ``,
    `Etapas disponibles por pipeline (usa stageId al mover un deal):`,
    ...pipelines.map(p =>
      `  Pipeline "${p.name}" [id:${p.id}]:\n` +
      p.stages.map(s => `    - "${s.name}" [stageId:${s.id}]`).join("\n")
    ),
    ``,
    `═══════════════════════════════════════`,
    `TAREAS`,
    `═══════════════════════════════════════`,
    `• Pendientes: ${pendingTasks} | Vencidas: ${overdueTasks}`,
    `• Tareas para hoy (${fmt(now)}): ${todayTasks.length}`,
    ...todayTasks.map(t => {
      const who = t.contact ? `${t.contact.firstName} ${t.contact.lastName ?? ""}`.trim() : "";
      return `  - [id:${t.id}] "${t.title}"${who ? ` → ${who}` : ""}${t.deal ? ` (deal: ${t.deal.title})` : ""}`;
    }),
    ``,
    `═══════════════════════════════════════`,
    `CITAS PRÓXIMAS`,
    `═══════════════════════════════════════`,
    upcomingAppointments.length === 0
      ? `• Sin citas próximas`
      : upcomingAppointments.map(a => {
          const who = a.contact ? `${a.contact.firstName} ${a.contact.lastName ?? ""}`.trim() : "sin contacto";
          return `  - [id:${a.id}] ${fmtDt(a.startTime)} | ${a.appointmentType?.name ?? "Cita"} | ${who} | ${a.status}`;
        }).join("\n"),
    ``,
    `═══════════════════════════════════════`,
    `INSTRUCCIONES`,
    `═══════════════════════════════════════`,
    `Usa los datos anteriores para responder preguntas específicas.`,
    `Cuando el usuario pida crear, modificar o eliminar registros, usa los bloques \`action\` con los IDs reales del contexto anterior.`,
    `Los IDs aparecen entre corchetes: [id:...] y [stageId:...]. Úsalos directamente en el JSON del action.`,
    `Al mover un deal a una etapa perdida el motivo es OBLIGATORIO: si la persona no lo dijo, pregúntale por qué se perdió (no lo inventes) y úsalo como lostReason.`,
    `Una venta tiene UNA sola fecha: la del deal (cuándo se ganó). Las fechas de aceptación y pago de una cotización son datos de cobro. Si al conectar una cotización con un deal hay fechas distintas, pregunta cuál es la correcta.`,
    `Responde siempre en español, de forma concisa y útil.`,
  ];

  return lines.join("\n");
}
