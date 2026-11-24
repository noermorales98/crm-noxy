import { prisma } from "@/src/lib/db";
import { searchTerms } from "@/src/lib/ai-search-terms";
import { brandVoiceBlock, matchBrands } from "@/src/lib/ai-brand-match";
import { insightsText, summarizeVideos } from "@/src/lib/video-insights";

// Contexto de los módulos nuevos para el asistente: clientes, contenido, videos, docs y categorías del pipeline.
// Solo lectura y siempre de la organización activa. La bóveda NO se incluye: guarda secretos y la IA no debe verlos.

const fmt = (d: Date) => d.toLocaleDateString("es-MX", { weekday: "short", month: "short", day: "numeric" });
const clip = (text: string | null | undefined, max: number) => {
  const t = (text ?? "").replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max)}…` : t;
};

/** Resumen de los módulos nuevos (se reutiliza unos segundos, no depende del mensaje). */
export async function buildModulesContext(orgId: string): Promise<string> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const in14 = new Date(today.getTime() + 14 * 86_400_000);

  const [clients, contentClients, pendingByStatus, upcomingItems, lateItems, videoCount, recentVideos, topVideos, docCount, recentDocs, pipelines] = await Promise.all([
    prisma.client.findMany({
      where: { organizationId: orgId, isActive: true, listedInClients: true },
      orderBy: { name: "asc" },
      take: 25,
      select: { id: true, name: true, monthlyFee: true, currency: true, billingDay: true, contactName: true, email: true },
    }),
    prisma.contentClient.findMany({
      where: { organizationId: orgId, isActive: true },
      orderBy: { name: "asc" },
      take: 25,
      select: { id: true, name: true, kind: true, context: true, _count: { select: { items: true, videos: true } } },
    }),
    prisma.contentItem.groupBy({ by: ["publishStatus"], where: { organizationId: orgId }, _count: { _all: true } }),
    prisma.contentItem.findMany({
      where: { organizationId: orgId, date: { gte: today, lte: in14 }, publishStatus: { not: "subido" } },
      orderBy: { date: "asc" },
      take: 20,
      select: { id: true, date: true, type: true, title: true, publishStatus: true, client: { select: { name: true } } },
    }),
    prisma.contentItem.findMany({
      where: { organizationId: orgId, date: { lt: today }, publishStatus: { notIn: ["subido", "aprobado"] } },
      orderBy: { date: "desc" },
      take: 8,
      select: { id: true, date: true, type: true, title: true, publishStatus: true, client: { select: { name: true } } },
    }),
    prisma.video.count({ where: { organizationId: orgId } }),
    prisma.video.findMany({
      where: { organizationId: orgId },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      take: 6,
      select: { id: true, title: true, platform: true, views: true, leadsGenerated: true, hookType: true, publishedAt: true },
    }),
    prisma.video.findMany({
      where: { organizationId: orgId, views: { not: null } },
      orderBy: { views: "desc" },
      take: 3,
      select: { title: true, platform: true, views: true, hookType: true },
    }),
    prisma.kbPage.count({ where: { organizationId: orgId, isFolder: false } }),
    prisma.kbPage.findMany({
      where: { organizationId: orgId, isFolder: false },
      orderBy: { updatedAt: "desc" },
      take: 10,
      select: { id: true, title: true, updatedAt: true },
    }),
    prisma.pipeline.findMany({ where: { organizationId: orgId }, select: { name: true, _count: { select: { deals: true } } } }),
  ]);

  const mrr = clients.reduce((s, c) => s + (c.monthlyFee || 0), 0);
  const L: string[] = [];

  L.push("CLIENTES (cartera de la agencia)");
  L.push(`• Activos: ${clients.length} | Ingreso mensual recurrente aprox.: $${mrr.toLocaleString("es-MX")}`);
  for (const c of clients) L.push(`  - [id:${c.id}] ${c.name} | $${c.monthlyFee.toLocaleString("es-MX")} ${c.currency}/mes | cobra el día ${c.billingDay}${c.contactName ? ` | contacto: ${c.contactName}` : ""}`);

  L.push("", "PIPELINE DE VENTAS: categorías (cada categoría es un pipeline)");
  for (const p of pipelines) L.push(`  - ${p.name}: ${p._count.deals} deals`);

  L.push("", "GESTIÓN DE CONTENIDO");
  L.push(`• Clientes/marcas de contenido: ${contentClients.length}`);
  for (const c of contentClients) L.push(`  - [id:${c.id}] ${c.name} (${c.kind}) | ${c._count.items} piezas, ${c._count.videos} videos${c.context ? ` | voz y contexto: ${clip(c.context, 140)}` : ""}`);
  L.push(`• Piezas por estado: ${pendingByStatus.map((g) => `${g.publishStatus} ${g._count._all}`).join(", ") || "ninguna"}`);
  L.push(`• Próximos 14 días (sin subir): ${upcomingItems.length}`);
  for (const i of upcomingItems) L.push(`  - [id:${i.id}] ${fmt(i.date)} | ${i.type} | "${i.title}" | ${i.client.name} | ${i.publishStatus}`);
  if (lateItems.length) {
    L.push(`• Atrasadas (fecha pasada y sin aprobar/subir): ${lateItems.length}`);
    for (const i of lateItems) L.push(`  - [id:${i.id}] ${fmt(i.date)} | ${i.type} | "${i.title}" | ${i.client.name} | ${i.publishStatus}`);
  }

  L.push("", "VIDEOS Y VIRALIDAD");
  L.push(`• Videos registrados: ${videoCount}`);
  for (const v of recentVideos) L.push(`  - [id:${v.id}] "${v.title}" | ${v.platform}${v.views != null ? ` | ${v.views.toLocaleString("es-MX")} vistas` : ""}${v.leadsGenerated != null ? ` | ${v.leadsGenerated} leads` : ""}${v.hookType ? ` | gancho: ${v.hookType}` : ""}`);
  if (topVideos.length) L.push(`• Más vistos: ${topVideos.map((v) => `"${v.title}" (${(v.views ?? 0).toLocaleString("es-MX")})`).join("; ")}`);

  L.push("", "DOCS (base de conocimiento)");
  L.push(`• Páginas: ${docCount}. Más recientes:`);
  for (const d of recentDocs) L.push(`  - [id:${d.id}] ${d.title} | editada ${fmt(d.updatedAt)}`);

  L.push("", "BÓVEDA: contiene credenciales cifradas; no tienes acceso a ellas. Si te las piden, indica que se consultan solo desde la Bóveda.");
  return L.join("\n");
}

/** Si el mensaje nombra una marca o cliente de contenido: su voz completa, sus últimas piezas y sus videos con más vistas. */
export async function buildBrandContext(orgId: string, message: string): Promise<string> {
  const all = await prisma.contentClient.findMany({ where: { organizationId: orgId, isActive: true }, select: { id: true, name: true } });
  const brands = matchBrands(message, all);
  if (!brands.length) return "";

  const blocks = await Promise.all(
    brands.map(async (b) => {
      const [client, items, videos] = await Promise.all([
        prisma.contentClient.findFirst({ where: { id: b.id, organizationId: orgId }, select: { name: true, description: true, context: true } }),
        prisma.contentItem.findMany({
          where: { organizationId: orgId, clientId: b.id },
          orderBy: { date: "desc" },
          take: 5,
          select: { id: true, date: true, type: true, title: true, hook: true, publishStatus: true },
        }),
        prisma.video.findMany({
          where: { organizationId: orgId, contentClientId: b.id },
          orderBy: [{ views: "desc" }, { createdAt: "desc" }],
          take: 60,
          select: { title: true, platform: true, views: true, hook: true, hookType: true, format: true, leadsGenerated: true, durationSeconds: true },
        }),
      ]);
      if (!client) return "";
      const L = [brandVoiceBlock(client.name, client.context, client.description), `[id de la marca: ${b.id}]`];
      if (items.length) {
        L.push("Últimas piezas:");
        for (const i of items) L.push(`  - [id:${i.id}] ${fmt(i.date)} | ${i.type} | "${i.title}" | ${i.publishStatus}${i.hook ? ` | gancho: ${clip(i.hook, 140)}` : ""}`);
      }
      if (videos.length) L.push(insightsText(client.name, summarizeVideos(videos)));
      return L.join("\n");
    }),
  );
  const text = blocks.filter(Boolean).join("\n\n");
  return text ? `\n\n=== MARCA MENCIONADA (escribe con su voz) ===\n${text}` : "";
}

/** Lo que el mensaje menciona: fragmentos de docs, piezas de contenido y videos que coinciden. Vacío si no hay coincidencias. */
export async function buildRelevantContext(orgId: string, message: string): Promise<string> {
  const terms = searchTerms(message);
  if (!terms.length) return "";
  const like = (field: string) => terms.map((t) => ({ [field]: { contains: t } }));

  const [docs, items, videos] = await Promise.all([
    prisma.kbPage.findMany({
      where: { organizationId: orgId, isFolder: false, OR: [...like("title"), ...like("content")] },
      orderBy: { updatedAt: "desc" },
      take: 3,
      select: { id: true, title: true, content: true },
    }),
    prisma.contentItem.findMany({
      where: { organizationId: orgId, OR: [...like("title"), ...like("hook"), ...like("caption")] },
      orderBy: { date: "desc" },
      take: 4,
      select: { id: true, date: true, type: true, title: true, hook: true, caption: true, publishStatus: true, client: { select: { name: true } } },
    }),
    prisma.video.findMany({
      where: { organizationId: orgId, OR: [...like("title"), ...like("hook"), ...like("notes")] },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: { id: true, title: true, platform: true, hook: true, views: true, notes: true },
    }),
  ]);

  const L: string[] = [];
  if (docs.length) {
    L.push("DOCS RELACIONADOS CON LA PREGUNTA:");
    for (const d of docs) {
      const text = d.content ?? "";
      const at = Math.max(0, terms.map((t) => text.toLowerCase().indexOf(t)).find((i) => i >= 0) ?? 0);
      L.push(`  - [id:${d.id}] ${d.title}: ${clip(text.slice(Math.max(0, at - 80)), 500)}`);
    }
  }
  if (items.length) {
    L.push("PIEZAS DE CONTENIDO RELACIONADAS:");
    for (const i of items) L.push(`  - [id:${i.id}] ${fmt(i.date)} | ${i.type} | "${i.title}" | ${i.client.name} | ${i.publishStatus}${i.hook ? ` | gancho: ${clip(i.hook, 160)}` : ""}${i.caption ? ` | caption: ${clip(i.caption, 200)}` : ""}`);
  }
  if (videos.length) {
    L.push("VIDEOS RELACIONADOS:");
    for (const v of videos) L.push(`  - [id:${v.id}] "${v.title}" | ${v.platform}${v.views != null ? ` | ${v.views.toLocaleString("es-MX")} vistas` : ""}${v.hook ? ` | gancho: ${clip(v.hook, 160)}` : ""}${v.notes ? ` | notas: ${clip(v.notes, 200)}` : ""}`);
  }
  return L.length ? `\n\n=== COINCIDENCIAS EN EL CRM ===\n${L.join("\n")}` : "";
}

type PageRef = { page: string; id?: string } | null | undefined;

/**
 * El contenido real del registro que la persona tiene abierto (cita con sus notas, doc, deal, marca o pieza), siempre de su
 * organización. Sin esto la IA solo sabría el título de la pantalla.
 */
export async function buildPageRecordContext(orgId: string, ref: PageRef): Promise<string> {
  if (!ref?.id) return "";
  const id = ref.id;
  const L: string[] = [];

  if (ref.page === "appointment") {
    const a = await prisma.appointment.findFirst({
      where: { id, organizationId: orgId },
      select: {
        title: true, startTime: true, endTime: true, status: true, guestName: true, guestEmail: true, notes: true,
        contact: { select: { id: true, firstName: true, lastName: true } },
        granolaNotes: { orderBy: { startedAt: "desc" }, take: 3, select: { source: true, title: true, summary: true, privateNotes: true, items: { select: { text: true } } } },
      },
    });
    if (!a) return "";
    L.push(`CITA ABIERTA: ${a.title ?? "Cita"} | ${fmt(a.startTime)} | ${a.status} | invitado: ${a.guestName} <${a.guestEmail}>${a.contact ? ` | contacto [id:${a.contact.id}]` : ""}`);
    if (a.notes) L.push(`Descripción: ${clip(a.notes, 600)}`);
    for (const n of a.granolaNotes) {
      L.push(`Nota (${n.source}${n.title ? `: ${n.title}` : ""}):`);
      if (n.summary) L.push(clip(n.summary, 2500));
      if (n.privateNotes) L.push(`Notas privadas: ${clip(n.privateNotes, 1500)}`);
      if (n.items.length) L.push(`Pasos detectados: ${n.items.map((i) => i.text).join(" · ")}`);
    }
  } else if (ref.page === "kb") {
    const d = await prisma.kbPage.findFirst({ where: { id, organizationId: orgId }, select: { title: true, isFolder: true, content: true } });
    if (!d) return "";
    L.push(`DOC ABIERTO [id:${id}]: ${d.title}${d.isFolder ? " (carpeta)" : ""}`);
    if (d.content) L.push(clip(d.content, 6000));
  } else if (ref.page === "deal") {
    const d = await prisma.deal.findFirst({
      where: { id, organizationId: orgId },
      select: {
        title: true, value: true, currency: true, notes: true, followUpAt: true, source: true,
        stage: { select: { name: true, isWon: true, isLost: true } },
        pipeline: { select: { name: true } },
        contact: { select: { firstName: true, lastName: true, email: true } },
        company: { select: { name: true } },
        tasks: { where: { isCompleted: false }, take: 5, select: { title: true } },
      },
    });
    if (!d) return "";
    L.push(`DEAL ABIERTO [id:${id}]: "${d.title}" | ${d.pipeline?.name ?? ""} → ${d.stage.name}${d.stage.isWon ? " (GANADO)" : d.stage.isLost ? " (PERDIDO)" : ""} | $${(d.value ?? 0).toLocaleString("es-MX")} ${d.currency}${d.source ? ` | fuente ${d.source}` : ""}${d.followUpAt ? ` | seguimiento ${fmt(d.followUpAt)}` : ""}`);
    if (d.contact) L.push(`Contacto: ${d.contact.firstName} ${d.contact.lastName ?? ""} <${d.contact.email ?? "sin email"}>${d.company ? ` · ${d.company.name}` : ""}`);
    if (d.notes) L.push(`Notas: ${clip(d.notes, 1500)}`);
    if (d.tasks.length) L.push(`Tareas abiertas: ${d.tasks.map((t) => t.title).join(" · ")}`);
  } else if (ref.page === "content_client") {
    return buildBrandContext(orgId, (await prisma.contentClient.findFirst({ where: { id, organizationId: orgId }, select: { name: true } }))?.name ?? "");
  } else if (ref.page === "content_item") {
    const i = await prisma.contentItem.findFirst({
      where: { id, organizationId: orgId },
      select: { title: true, type: true, date: true, publishStatus: true, hook: true, script: true, caption: true, cta: true, note: true, client: { select: { id: true, name: true, context: true } } },
    });
    if (!i) return "";
    L.push(`PIEZA ABIERTA [id:${id}]: "${i.title}" | ${i.type} | ${fmt(i.date)} | ${i.publishStatus} | marca ${i.client.name}`);
    for (const [label, v] of [["Gancho", i.hook], ["Guion", i.script], ["Caption", i.caption], ["CTA", i.cta], ["Nota interna", i.note]] as const) if (v) L.push(`${label}: ${clip(v, 1800)}`);
    L.push(brandVoiceBlock(i.client.name, i.client.context, null));
  }

  return L.length ? `\n\n=== REGISTRO QUE LA PERSONA TIENE ABIERTO ===\n${L.join("\n")}` : "";
}


/** Cotizaciones recientes y empresas (con su id) para que la IA pueda editarlas, enviarlas o escribir desde la cuenta correcta. */
export async function buildSalesDocsContext(orgId: string): Promise<string> {
  const [quotes, unlinkedPaid, companies] = await Promise.all([
    prisma.quote.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      take: 15,
      select: { id: true, folio: true, status: true, clientName: true, clientEmail: true, total: true, currency: true, acceptedAt: true, paidAt: true, depositPaidAt: true, finalPaidAt: true, deal: { select: { id: true, title: true } } },
    }),
    // Cotizaciones ya pagadas sin deal: no están en el historial de ventas hasta que se conecten con un deal.
    prisma.quote.findMany({
      where: { organizationId: orgId, status: "PAGADA", dealId: null },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, folio: true, clientName: true, total: true, currency: true, acceptedAt: true, paidAt: true },
    }),
    prisma.company.findMany({
      where: { organizationId: orgId },
      orderBy: { name: "asc" },
      take: 20,
      select: { id: true, name: true, smtpHost: true },
    }),
  ]);
  const L: string[] = ["=== COTIZACIONES Y EMPRESAS ==="];
  L.push(quotes.length ? "Cotizaciones recientes:" : "Aún no hay cotizaciones.");
  const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);
  for (const q of quotes) {
    const dates = [q.acceptedAt && `aceptada ${day(q.acceptedAt)}`, q.depositPaidAt && `anticipo ${day(q.depositPaidAt)}`, q.finalPaidAt && `pago final ${day(q.finalPaidAt)}`, !q.depositPaidAt && !q.finalPaidAt && q.paidAt && `pagada ${day(q.paidAt)}`].filter(Boolean).join(", ");
    L.push(`  - [id:${q.id}] ${q.folio} | ${q.status} | ${q.clientName} <${q.clientEmail ?? "sin correo"}> | ${q.total} ${q.currency} | ${q.deal ? `deal: "${q.deal.title}" [id:${q.deal.id}]` : "sin deal"}${dates ? ` | ${dates}` : ""}`);
  }
  if (unlinkedPaid.length) {
    L.push("Cotizaciones PAGADAS sin deal (no aparecen en el historial de ventas; sugiere conectarlas con un deal, existente o nuevo):");
    for (const q of unlinkedPaid) L.push(`  - [id:${q.id}] ${q.folio} | ${q.clientName} | ${q.total} ${q.currency} | aceptada ${day(q.acceptedAt) ?? "—"}, pagada ${day(q.paidAt) ?? "—"}`);
  }
  if (companies.length) {
    L.push("Empresas (para enviar correos usa el companyId de una con correo configurado):");
    for (const c of companies) L.push(`  - [id:${c.id}] ${c.name}${c.smtpHost ? " | con correo configurado" : ""}`);
  }
  return L.join("\n");
}
