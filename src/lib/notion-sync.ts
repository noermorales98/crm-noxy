import { prisma } from "@/src/lib/db";
import { resolveNotionSettings, type NotionEnv } from "@/src/lib/mcp/notion-credentials";
import { notionFetch } from "@/src/lib/notion-api";
import { markdownToNotionBlocks, type NotionBlock } from "@/src/lib/notion-blocks";
import { docToNotionProperties, leadToNotionProperties, type LeadNotionFields } from "@/src/lib/mcp/notion-map";

export type SyncKind = "deal" | "doc";
export type SyncResult =
  | { ok: true; action: "created" | "updated"; pageId: string; url: string | null }
  | { ok: false; error: string; skipped?: boolean };

const BATCH = 10;
const BLOCKS_PER_REQUEST = 100;
const DOC_THROTTLE_MS = 60_000;

const message = (error: unknown) => (error instanceof Error ? error.message : "Notion no respondió");
const idOf = (page: Record<string, unknown>) => (typeof page.id === "string" ? page.id : null);
const urlOf = (page: Record<string, unknown>) => (typeof page.url === "string" ? page.url : null);
const firstId = (result: Record<string, unknown>) => {
  const first = Array.isArray(result.results) ? (result.results[0] as { id?: string } | undefined) : undefined;
  return first?.id ?? null;
};

async function findByCrmId(env: NotionEnv, databaseId: string, property: string, crmId: string) {
  const found = await notionFetch(env, `/databases/${databaseId}/query`, {
    method: "POST",
    body: JSON.stringify({ page_size: 1, filter: { property, rich_text: { equals: crmId } } }),
  });
  return firstId(found);
}

/** Actualiza la página; si ya no existe en Notion (borrada o archivada) devuelve null para crearla de nuevo. */
async function tryUpdate(env: NotionEnv, pageId: string, properties: Record<string, unknown>) {
  try {
    const page = await notionFetch(env, `/pages/${pageId}`, { method: "PATCH", body: JSON.stringify({ properties, archived: false }) });
    return page;
  } catch (error) {
    if (/archived|Could not find|not find page|object_not_found/i.test(message(error))) return null;
    throw error;
  }
}

export async function syncDeal(organizationId: string, dealId: string): Promise<SyncResult> {
  const settings = await resolveNotionSettings(organizationId);
  if (!settings) return { ok: false, error: "Notion no está configurado. Agrega el token y la base en Ajustes › Integraciones." };
  const { env } = settings;
  const deal = await prisma.deal.findFirst({
    where: { id: dealId, organizationId },
    include: { stage: { select: { name: true } }, contact: { select: { email: true, phone: true } } },
  });
  if (!deal) return { ok: false, error: "Deal no encontrado" };
  const fields: LeadNotionFields = {
    title: deal.title,
    email: deal.contact?.email,
    phone: deal.contact?.phone,
    value: deal.value,
    stage: deal.stage.name,
    source: deal.source,
    dealId: deal.id,
  };
  const properties = leadToNotionProperties(fields);
  try {
    const existingId = deal.notionPageId ?? (await findByCrmId(env, env.databaseId, "CRM Deal ID", deal.id));
    const updated = existingId ? await tryUpdate(env, existingId, properties) : null;
    const page = updated ?? (await notionFetch(env, "/pages", { method: "POST", body: JSON.stringify({ parent: { database_id: env.databaseId }, properties }) }));
    const pageId = idOf(page);
    if (!pageId) return { ok: false, error: "Notion no devolvió el id de la página" };
    if (pageId !== deal.notionPageId) await prisma.deal.updateMany({ where: { id: deal.id, organizationId }, data: { notionPageId: pageId } });
    return { ok: true, action: updated ? "updated" : "created", pageId, url: urlOf(page) };
  } catch (error) {
    return { ok: false, error: message(error) };
  }
}

async function replaceChildren(env: NotionEnv, pageId: string, blocks: NotionBlock[]) {
  // Vacía el contenido anterior y escribe el actual.
  for (;;) {
    const children = await notionFetch(env, `/blocks/${pageId}/children?page_size=100`);
    const ids = (Array.isArray(children.results) ? children.results : []).map((child) => (child as { id: string }).id);
    if (!ids.length) break;
    for (const id of ids) await notionFetch(env, `/blocks/${id}`, { method: "DELETE" });
    if (children.has_more !== true) break;
  }
  await appendChildren(env, pageId, blocks);
}

async function appendChildren(env: NotionEnv, pageId: string, blocks: NotionBlock[]) {
  for (let i = 0; i < blocks.length; i += BLOCKS_PER_REQUEST) {
    await notionFetch(env, `/blocks/${pageId}/children`, { method: "PATCH", body: JSON.stringify({ children: blocks.slice(i, i + BLOCKS_PER_REQUEST) }) });
  }
}

export async function syncDoc(organizationId: string, docId: string): Promise<SyncResult> {
  const settings = await resolveNotionSettings(organizationId);
  if (!settings) return { ok: false, error: "Notion no está configurado. Agrega el token y la base en Ajustes › Integraciones." };
  const { env } = settings;
  if (!env.docsDatabaseId) return { ok: false, error: "Falta la base de documentos de Notion en Ajustes › Integraciones." };
  const doc = await prisma.kbPage.findFirst({ where: { id: docId, organizationId } });
  if (!doc) return { ok: false, error: "Documento no encontrado" };
  if (doc.isFolder) return { ok: false, skipped: true, error: "Las carpetas no se envían a Notion." };
  const properties = docToNotionProperties({ title: doc.title, docId: doc.id });
  const blocks = markdownToNotionBlocks(doc.content);
  try {
    const existingId = doc.notionPageId ?? (await findByCrmId(env, env.docsDatabaseId, "CRM Doc ID", doc.id));
    const updated = existingId ? await tryUpdate(env, existingId, properties) : null;
    let page = updated;
    let pageId = updated ? idOf(updated) : null;
    if (updated && pageId) {
      await replaceChildren(env, pageId, blocks);
    } else {
      page = await notionFetch(env, "/pages", {
        method: "POST",
        body: JSON.stringify({ parent: { database_id: env.docsDatabaseId }, properties, children: blocks.slice(0, BLOCKS_PER_REQUEST) }),
      });
      pageId = idOf(page);
      if (pageId) await appendChildren(env, pageId, blocks.slice(BLOCKS_PER_REQUEST));
    }
    if (!pageId || !page) return { ok: false, error: "Notion no devolvió el id de la página" };
    if (pageId !== doc.notionPageId) await prisma.kbPage.updateMany({ where: { id: doc.id, organizationId }, data: { notionPageId: pageId } });
    await prisma.kbPage.updateMany({ where: { id: doc.id, organizationId }, data: { notionSyncedAt: new Date() } });
    return { ok: true, action: updated ? "updated" : "created", pageId, url: urlOf(page) };
  } catch (error) {
    return { ok: false, error: message(error) };
  }
}

export type BatchResult = { total: number; processed: number; created: number; updated: number; failed: number; errors: string[]; nextOffset: number | null };

/** Sincroniza un lote (10) y dice desde dónde seguir; la pantalla repite hasta que `nextOffset` sea null. */
export async function syncBatch(organizationId: string, kind: SyncKind, offset: number): Promise<BatchResult> {
  const where = kind === "deal" ? { organizationId, isArchived: false } : { organizationId, isFolder: false };
  const ids =
    kind === "deal"
      ? await prisma.deal.findMany({ where, orderBy: { createdAt: "asc" }, skip: offset, take: BATCH, select: { id: true } })
      : await prisma.kbPage.findMany({ where, orderBy: { createdAt: "asc" }, skip: offset, take: BATCH, select: { id: true } });
  const total = kind === "deal" ? await prisma.deal.count({ where }) : await prisma.kbPage.count({ where });
  const result: BatchResult = { total, processed: ids.length, created: 0, updated: 0, failed: 0, errors: [], nextOffset: null };
  for (const { id } of ids) {
    const outcome = kind === "deal" ? await syncDeal(organizationId, id) : await syncDoc(organizationId, id);
    if (outcome.ok) {
      if (outcome.action === "created") result.created++;
      else result.updated++;
    } else {
      result.failed++;
      if (result.errors.length < 3) result.errors.push(outcome.error);
    }
  }
  if (offset + ids.length < total) result.nextOffset = offset + ids.length;
  return result;
}

/** Sincronización automática: nunca interrumpe la operación del CRM; si falla, solo lo registra. */
export async function autoSync(organizationId: string, kind: SyncKind, id: string): Promise<void> {
  try {
    const settings = await resolveNotionSettings(organizationId);
    if (!settings || (kind === "deal" ? !settings.autoSyncDeals : !settings.autoSyncDocs)) return;
    if (kind === "doc") {
      // Los documentos se guardan solos mientras se escribe: no más de uno por minuto (el cron recoge el resto).
      const doc = await prisma.kbPage.findFirst({ where: { id, organizationId }, select: { notionSyncedAt: true } });
      if (doc?.notionSyncedAt && Date.now() - doc.notionSyncedAt.getTime() < DOC_THROTTLE_MS) return;
    }
    const outcome = kind === "deal" ? await syncDeal(organizationId, id) : await syncDoc(organizationId, id);
    if (!outcome.ok && !outcome.skipped) console.error(`[notion auto-sync] ${kind} ${id}: ${outcome.error}`);
  } catch (error) {
    console.error(`[notion auto-sync] ${kind} ${id}:`, error);
  }
}

/** Respaldo del auto-sync de documentos: envía los editados desde su último envío (para el cron). */
export async function syncPendingDocs(limit = 10): Promise<{ organizations: number; synced: number; failed: number }> {
  const configs = await prisma.notionConfig.findMany({ where: { autoSyncDocs: true, docsDatabaseId: { not: null } }, select: { organizationId: true } });
  let synced = 0;
  let failed = 0;
  for (const { organizationId } of configs) {
    const pending = await prisma.kbPage.findMany({
      where: { organizationId, isFolder: false, OR: [{ notionSyncedAt: null }, { notionSyncedAt: { lt: new Date(Date.now() - DOC_THROTTLE_MS) } }] },
      orderBy: { updatedAt: "desc" },
      take: limit * 3,
      select: { id: true, updatedAt: true, notionSyncedAt: true },
    });
    const due = pending.filter((doc) => !doc.notionSyncedAt || doc.updatedAt > doc.notionSyncedAt).slice(0, limit);
    for (const { id } of due) {
      const outcome = await syncDoc(organizationId, id);
      if (outcome.ok) synced++;
      else failed++;
    }
  }
  return { organizations: configs.length, synced, failed };
}
