import { prisma } from "@/src/lib/db";
import { searchTerms } from "@/src/lib/ai-search-terms";
import { brandVoiceBlock, matchBrands } from "@/src/lib/ai-brand-match";

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
          take: 4,
          select: { title: true, platform: true, views: true, hook: true, hookType: true },
        }),
      ]);
      if (!client) return "";
      const L = [brandVoiceBlock(client.name, client.context, client.description), `[id de la marca: ${b.id}]`];
      if (items.length) {
        L.push("Últimas piezas:");
        for (const i of items) L.push(`  - [id:${i.id}] ${fmt(i.date)} | ${i.type} | "${i.title}" | ${i.publishStatus}${i.hook ? ` | gancho: ${clip(i.hook, 140)}` : ""}`);
      }
      if (videos.length) {
        L.push("Videos que mejor rindieron:");
        for (const v of videos) L.push(`  - "${v.title}" | ${v.platform}${v.views != null ? ` | ${v.views.toLocaleString("es-MX")} vistas` : ""}${v.hookType ? ` | gancho tipo ${v.hookType}` : ""}${v.hook ? `: ${clip(v.hook, 140)}` : ""}`);
      }
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
