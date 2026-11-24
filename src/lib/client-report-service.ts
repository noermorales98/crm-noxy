import { prisma } from "@/src/lib/db";
import { monthRange, renderClientReport, sameName, monthLabel, type ReportData, type ReportMonth } from "@/src/lib/client-report";

const dayLabel = (d: Date) => d.toLocaleDateString("es-MX", { day: "numeric", month: "short", timeZone: "UTC" });

/** Reúne los datos del mes de un cliente de la agencia (cobros, contenido y videos de su marca si se llama igual). */
export async function gatherClientReport(organizationId: string, clientId: string, period: ReportMonth, contentClientId?: string | null): Promise<ReportData | null> {
  const client = await prisma.client.findFirst({ where: { id: clientId, organizationId }, select: { name: true, monthlyFee: true, currency: true } });
  if (!client) return null;
  const { from, to } = monthRange(period);

  // El cliente de facturación y el de contenido no están enlazados: se enlazan por nombre, o por el que se indique.
  const contentClients = await prisma.contentClient.findMany({ where: { organizationId }, select: { id: true, name: true } });
  const brand = contentClientId ? contentClients.find((c) => c.id === contentClientId) : contentClients.find((c) => sameName(c.name, client.name));

  const [payments, items, videos] = await Promise.all([
    prisma.clientPayment.findMany({ where: { organizationId, clientId, month: period.month, year: period.year }, select: { amount: true, status: true, receivedAt: true } }),
    brand ? prisma.contentItem.findMany({ where: { organizationId, clientId: brand.id, date: { gte: from, lt: to } }, orderBy: { date: "asc" }, select: { title: true, type: true, date: true, publishStatus: true } }) : Promise.resolve(null),
    brand ? prisma.video.findMany({ where: { organizationId, contentClientId: brand.id, publishedAt: { gte: from, lt: to } }, select: { title: true, platform: true, views: true, leadsGenerated: true } }) : Promise.resolve([]),
  ]);

  return {
    clientName: client.name,
    period,
    currency: client.currency,
    monthlyFee: client.monthlyFee,
    payments: payments.map((p) => ({ amount: p.amount, status: p.status, receivedAt: p.receivedAt ? dayLabel(p.receivedAt) : null })),
    content: items ? { delivered: items.filter((i) => i.publishStatus === "subido").map((i) => ({ title: i.title, type: i.type, date: dayLabel(i.date) })), pending: items.filter((i) => i.publishStatus !== "subido").length } : null,
    videos: videos.map((v) => ({ title: v.title, platform: v.platform, views: v.views, leads: v.leadsGenerated })),
  };
}

/** Guarda el informe como un doc nuevo. Devuelve su id. */
export async function saveReportDoc(organizationId: string, data: ReportData, markdown: string): Promise<string> {
  const max = await prisma.kbPage.aggregate({ where: { organizationId, parentId: null }, _max: { sortOrder: true } });
  const page = await prisma.kbPage.create({
    data: { organizationId, title: `Informe ${monthLabel(data.period)} — ${data.clientName}`.slice(0, 120), emoji: "📊", content: markdown, sortOrder: (max._max.sortOrder ?? 0) + 1 },
    select: { id: true },
  });
  return page.id;
}

/** Informe + doc de cada cliente activo de la agencia (para el cierre de mes programado). */
export async function buildMonthlyReports(organizationId: string, period: ReportMonth): Promise<{ clientName: string; docId: string }[]> {
  const clients = await prisma.client.findMany({ where: { organizationId, isActive: true, listedInClients: true }, select: { id: true }, orderBy: { name: "asc" } });
  const out: { clientName: string; docId: string }[] = [];
  for (const c of clients) {
    const data = await gatherClientReport(organizationId, c.id, period);
    if (!data) continue;
    out.push({ clientName: data.clientName, docId: await saveReportDoc(organizationId, data, renderClientReport(data)) });
  }
  return out;
}
