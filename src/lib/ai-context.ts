import { prisma } from "@/src/lib/db";

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
    pendingTasks,
    overdueTasks,
    todayTasks,
    upcomingAppointments,
  ] = await Promise.all([
    prisma.contact.count({ where: { organizationId: orgId } }),
    prisma.contact.count({ where: { organizationId: orgId, createdAt: { gte: startOfWeek } } }),
    prisma.contact.count({ where: { organizationId: orgId, createdAt: { gte: startOfMonth } } }),
    prisma.contact.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      take: 15,
      select: {
        firstName: true, lastName: true, email: true, phone: true,
        createdAt: true, source: true,
        company: { select: { name: true } },
      },
    }),
    prisma.company.count({ where: { organizationId: orgId } }),
    prisma.company.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { name: true, industry: true, website: true, createdAt: true },
    }),
    prisma.deal.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        title: true, value: true, currency: true, createdAt: true, followUpAt: true, notes: true,
        stage: { select: { name: true, isWon: true, isLost: true } },
        contact: { select: { firstName: true, lastName: true, email: true } },
        company: { select: { name: true } },
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
        title: true, dueDate: true,
        contact: { select: { firstName: true, lastName: true } },
        deal: { select: { title: true } },
      },
    }),
    prisma.appointment.findMany({
      where: { organizationId: orgId, startTime: { gte: now } },
      orderBy: { startTime: "asc" },
      take: 5,
      select: {
        startTime: true, endTime: true, status: true,
        appointmentType: { select: { name: true } },
        contact: { select: { firstName: true, lastName: true, email: true } },
      },
    }),
  ]);

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
    `Últimos ${recentContacts.length} contactos:`,
    ...recentContacts.map(c =>
      `  - ${c.firstName} ${c.lastName ?? ""} | ${c.email ?? "sin email"} | ${c.company?.name ?? "sin empresa"} | agregado ${fmt(c.createdAt)}${c.source ? ` | fuente: ${c.source}` : ""}`
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
    ``,
    `Deals recientes (${activeDeals.length}):`,
    ...activeDeals.map(d => {
      const contact = d.contact ? `${d.contact.firstName} ${d.contact.lastName ?? ""}`.trim() : "sin contacto";
      const co = d.company?.name ?? "";
      const followUp = d.followUpAt ? ` | seguimiento: ${fmt(d.followUpAt)}` : "";
      const status = d.stage.isWon ? "GANADO" : d.stage.isLost ? "PERDIDO" : d.stage.name;
      return `  - "${d.title}" | $${(d.value || 0).toLocaleString()} ${d.currency} | etapa: ${status} | ${contact}${co ? ` / ${co}` : ""}${followUp}`;
    }),
    ``,
    `═══════════════════════════════════════`,
    `TAREAS`,
    `═══════════════════════════════════════`,
    `• Pendientes: ${pendingTasks} | Vencidas: ${overdueTasks}`,
    `• Tareas para hoy (${fmt(now)}): ${todayTasks.length}`,
    ...todayTasks.map(t => {
      const who = t.contact ? `${t.contact.firstName} ${t.contact.lastName ?? ""}`.trim() : "";
      return `  - "${t.title}"${who ? ` → ${who}` : ""}${t.deal ? ` (deal: ${t.deal.title})` : ""}`;
    }),
    ``,
    `═══════════════════════════════════════`,
    `CITAS PRÓXIMAS`,
    `═══════════════════════════════════════`,
    upcomingAppointments.length === 0
      ? `• Sin citas próximas`
      : upcomingAppointments.map(a => {
          const who = a.contact ? `${a.contact.firstName} ${a.contact.lastName ?? ""}`.trim() : "sin contacto";
          return `  - ${fmtDt(a.startTime)} | ${a.appointmentType?.name ?? "Cita"} | ${who} | ${a.status}`;
        }).join("\n"),
    ``,
    `═══════════════════════════════════════`,
    `INSTRUCCIONES`,
    `═══════════════════════════════════════`,
    `Usa los datos anteriores para responder preguntas específicas.`,
    `Si el usuario pide crear, modificar o eliminar registros, dile que eso aún no está disponible directamente desde el chat — debe hacerlo desde la sección correspondiente del CRM.`,
    `Responde siempre en español, de forma concisa y útil.`,
  ];

  return lines.join("\n");
}
