import { prisma } from "@/src/lib/db";
import { appSecretKey, decryptSecret, encryptSecret } from "@/src/lib/secret-box";
import type { Prisma } from "@prisma/client";
import { DEFAULT_MAX_DETAIL, GranolaError, createRestSource, statusForError, type GranolaSource } from "@/src/lib/granola-client";
import { connectMcp, createMcpProvider, createMcpSource, type McpAuthStore } from "@/src/lib/granola-mcp";
import { matchNoteToAppointment, mergeActionItems } from "@/src/lib/granola-match";
import { parseActionItems } from "@/src/lib/granola-parse";
import { isEditableNote } from "@/src/lib/granola-rules";
import { resolveNotionEnv } from "@/src/lib/mcp/notion-credentials";
import { notionFetch } from "@/src/lib/notion-api";
import { blocksToMarkdown, notionPageTitle, parseNotionPageId, type NotionBlock } from "@/src/lib/notion-page-md";
import { randomUUID } from "node:crypto";

const seal = (value: unknown) => encryptSecret(JSON.stringify(value), appSecretKey());
function open<T>(box: string | null): T | undefined {
  if (!box) return undefined;
  const plain = decryptSecret(box, appSecretKey());
  if (!plain) return undefined;
  try {
    return JSON.parse(plain) as T;
  } catch {
    return undefined;
  }
}

/** URL a la que Granola devuelve al usuario tras autorizar. Debe ser idéntica al conectar y al terminar. */
export function granolaRedirectUrl(requestUrl: string): string {
  return process.env.GRANOLA_MCP_REDIRECT_URI || `${new URL(requestUrl).origin}/api/granola/mcp/callback`;
}

/** Almacén OAuth de una organización: todo lo sensible se cifra antes de tocar la base. */
export function granolaAuthStore(organizationId: string): McpAuthStore {
  const read = () => prisma.granolaConfig.findUnique({ where: { organizationId } });
  const write = (data: Record<string, string | null>) => prisma.granolaConfig.update({ where: { organizationId }, data });
  return {
    loadClientInfo: async () => open((await read())?.mcpClientInfo ?? null),
    saveClientInfo: async (info) => void (await write({ mcpClientInfo: seal(info) })),
    loadTokens: async () => open((await read())?.mcpTokens ?? null),
    saveTokens: async (tokens) => void (await write({ mcpTokens: seal(tokens) })),
    loadVerifier: async () => open<string>((await read())?.mcpVerifier ?? null) ?? "",
    saveVerifier: async (verifier) => void (await write({ mcpVerifier: seal(verifier) })),
    saveState: async (state) => void (await write({ mcpState: state })),
  };
}

type OpenSource = { source: GranolaSource; close: () => Promise<void> };

async function openSource(config: { organizationId: string; mode: string; apiKey: string | null }, redirectUrl: string): Promise<OpenSource> {
  if (config.mode === "MCP") {
    const provider = createMcpProvider(granolaAuthStore(config.organizationId), redirectUrl, () => {
      // Con sesión ya autorizada nunca debería pedirse otra: si ocurre, la conexión caducó.
      throw new GranolaError("NEEDS_RECONNECT", "El acceso a Granola caducó: reconecta desde Ajustes.");
    });
    const caller = await connectMcp(provider);
    return { source: createMcpSource(caller), close: () => caller.close() };
  }
  const key = config.apiKey ? decryptSecret(config.apiKey, appSecretKey()) : null;
  if (!key) throw new GranolaError("INVALID_KEY", "La clave guardada no se puede leer; vuelve a pegarla.");
  return { source: createRestSource(key), close: async () => {} };
}

type StoredItem = { id: string; text: string; taskId: string | null; position: number };
type ItemsDb = Pick<Prisma.TransactionClient, "granolaActionItem">;
const ITEM_SELECT = { id: true, text: true, taskId: true, position: true } as const;

/** Deja los pasos de una nota al día con su resumen: agrega los nuevos, quita los pendientes que ya no están y conserva los convertidos. */
async function applyActionItems(db: ItemsDb, noteId: string, summary: string | null, existing: StoredItem[]) {
  const { create, removeIds } = mergeActionItems(existing, parseActionItems(summary));
  if (removeIds.length) await db.granolaActionItem.deleteMany({ where: { id: { in: removeIds }, noteId } });
  if (create.length) {
    const kept = existing.filter((item) => !removeIds.includes(item.id));
    const base = kept.reduce((max, item) => Math.max(max, item.position), -1) + 1;
    await db.granolaActionItem.createMany({ data: create.map((text, index) => ({ noteId, text, position: base + index })) });
  }
}

export type SyncOutcome =
  | { ok: true; synced: number; failed: number; complete: boolean; linked: number; unassigned: number }
  | { ok: false; code: string; message: string };

const LOCK_MS = 5 * 60_000;
const REMATCH_DAYS = 60;

/** Una sola sincronización a la vez por organización (el cron y un clic no se pisan). El bloqueo caduca solo por si algo se cuelga. */
async function claimSyncLock(organizationId: string): Promise<boolean> {
  const stale = new Date(Date.now() - LOCK_MS);
  const claimed = await prisma.granolaConfig.updateMany({
    where: { organizationId, OR: [{ syncingAt: null }, { syncingAt: { lt: stale } }] },
    data: { syncingAt: new Date() },
  });
  return claimed.count === 1;
}

async function loadMatchable(organizationId: string, times: number[]) {
  if (!times.length) return [];
  const appointments = await prisma.appointment.findMany({
    where: {
      organizationId,
      status: { not: "CANCELLED" },
      startTime: { gte: new Date(Math.min(...times) - 3_600_000), lte: new Date(Math.max(...times) + 3_600_000) },
    },
    select: { id: true, startTime: true, guestEmail: true, contact: { select: { email: true } } },
  });
  return appointments.map((a) => ({ id: a.id, startTime: a.startTime, guestEmail: a.guestEmail, contactEmail: a.contact?.email ?? null }));
}

function parseAttendees(raw: string | null): { name: string | null; email: string }[] {
  try {
    const value = raw ? JSON.parse(raw) : [];
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

/** Sesiones que quedaron sin asignar porque su cita se creó después: se vuelven a intentar emparejar. Nunca toca vínculos manuales. */
async function rematchUnassigned(organizationId: string) {
  const orphans = await prisma.granolaNote.findMany({
    where: { organizationId, appointmentId: null, linkSource: null, startedAt: { gte: new Date(Date.now() - REMATCH_DAYS * 86_400_000) } },
    orderBy: { startedAt: "desc" },
    take: 100,
    select: { id: true, startedAt: true, attendees: true },
  });
  const matchable = await loadMatchable(organizationId, orphans.map((o) => o.startedAt!.getTime()));
  for (const orphan of orphans) {
    const match = matchNoteToAppointment({ startedAt: orphan.startedAt, attendees: parseAttendees(orphan.attendees) }, matchable);
    if (match) await prisma.granolaNote.update({ where: { id: orphan.id }, data: { appointmentId: match, linkSource: "AUTO" } });
  }
}

/** Trae las sesiones nuevas o cambiadas, las empareja con citas y guarda resumen, notas y pasos. Idempotente y sin solaparse. */
export async function runGranolaSync(organizationId: string, redirectUrl: string): Promise<SyncOutcome> {
  const config = await prisma.granolaConfig.findUnique({ where: { organizationId } });
  if (!config || config.status === "PENDING") return { ok: false, code: "NOT_CONNECTED", message: "Granola no está conectado." };
  if (!(await claimSyncLock(organizationId))) return { ok: false, code: "BUSY", message: "Ya hay una sincronización en curso." };

  try {
    const { source, close } = await openSource(config, redirectUrl);
    try {
      const stored = await prisma.granolaNote.findMany({ where: { organizationId }, select: { granolaId: true, granolaUpdatedAt: true } });
      const known = new Map(stored.filter((n) => n.granolaUpdatedAt).map((n) => [n.granolaId, n.granolaUpdatedAt!.getTime()]));
      const since = config.lastSyncAt ? new Date(config.lastSyncAt.getTime() - 86_400_000) : null;
      const { notes, complete } = await source.fetchNotes({ since, known, maxDetail: DEFAULT_MAX_DETAIL });
      const matchable = await loadMatchable(organizationId, notes.map((n) => n.startedAt?.getTime()).filter((t): t is number => typeof t === "number"));

      let failed = 0;
      for (const note of notes) {
        try {
          // Nota y pasos se guardan juntos: si algo falla, la nota no queda marcada como al día sin sus pasos.
          await prisma.$transaction(async (tx) => {
            const existing = await tx.granolaNote.findUnique({
              where: { organizationId_granolaId: { organizationId, granolaId: note.granolaId } },
              include: { items: { select: ITEM_SELECT } },
            });
            // Un vínculo hecho a mano nunca lo toca la sincronización; uno automático solo cambia si hay una candidata clara.
            let appointmentId = existing?.appointmentId ?? null;
            let linkSource = existing?.linkSource ?? null;
            if (linkSource !== "MANUAL") {
              const auto = matchNoteToAppointment(note, matchable);
              if (auto) {
                appointmentId = auto;
                linkSource = "AUTO";
              }
            }
            const data = {
              title: note.title?.slice(0, 190) ?? null,
              url: note.url,
              startedAt: note.startedAt,
              endedAt: note.endedAt,
              attendees: JSON.stringify(note.attendees),
              summary: note.summary,
              privateNotes: note.privateNotes,
              granolaUpdatedAt: note.updatedAt,
              appointmentId,
              linkSource,
            };
            const saved = existing
              ? await tx.granolaNote.update({ where: { id: existing.id }, data })
              : await tx.granolaNote.create({ data: { ...data, organizationId, granolaId: note.granolaId } });
            await applyActionItems(tx, saved.id, note.summary, existing?.items ?? []);
          });
        } catch {
          failed++;
        }
      }
      await rematchUnassigned(organizationId);

      // La ventana solo avanza si se cubrió todo: si hubo tope, respuesta cortada o sesiones que no se guardaron, la
      // próxima corrida vuelve a mirar desde el mismo punto (lo ya guardado se salta solo).
      const covered = complete && failed === 0;
      await prisma.granolaConfig.update({
        where: { organizationId },
        data: {
          status: "CONNECTED",
          lastSyncCount: notes.length - failed,
          lastSyncError: failed ? `${failed} sesiones no se pudieron guardar; se reintentarán.` : complete ? null : "Hay más sesiones por traer; la siguiente sincronización continúa.",
          ...(covered ? { lastSyncAt: new Date() } : {}),
        },
      });
      const [linked, unassigned] = await Promise.all([
        prisma.granolaNote.count({ where: { organizationId, appointmentId: { not: null } } }),
        prisma.granolaNote.count({ where: { organizationId, appointmentId: null } }),
      ]);
      return { ok: true, synced: notes.length - failed, failed, complete, linked, unassigned };
    } finally {
      await close().catch(() => {});
    }
  } catch (error) {
    const code = error instanceof GranolaError ? error.code : "UNAVAILABLE";
    const message = error instanceof GranolaError ? error.message : "No se pudo sincronizar con Granola.";
    await prisma.granolaConfig.update({ where: { organizationId }, data: { status: statusForError(code), lastSyncError: message } }).catch(() => {});
    return { ok: false, code, message };
  } finally {
    await prisma.granolaConfig.updateMany({ where: { organizationId }, data: { syncingAt: null } }).catch(() => {});
  }
}

/** Valida una clave contra Granola sin guardarla. */
export async function checkGranolaApiKey(key: string): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    await createRestSource(key).check();
    return { ok: true };
  } catch (error) {
    return { ok: false, message: error instanceof GranolaError ? error.message : "No se pudo validar la clave." };
  }
}

export const sealSecret = (plain: string) => encryptSecret(plain, appSecretKey());


// ─── Notas escritas a mano e importadas de Notion ────────────────────────────

const MAX_MARKDOWN = 100_000;
const MAX_TITLE = 190;

export type NoteWrite = { ok: true; noteId: string } | { ok: false; status: number; message: string };

const cleanTitle = (value: unknown, fallback: string) => (typeof value === "string" && value.trim() ? value.trim().slice(0, MAX_TITLE) : fallback);

/** Valida el markdown escrito a mano: obligatorio, texto y con tope de tamaño. */
export function parseMarkdownInput(value: unknown): { ok: true; markdown: string } | { ok: false; message: string } {
  if (typeof value !== "string" || !value.trim()) return { ok: false, message: "Escribe la nota en markdown." };
  if (value.length > MAX_MARKDOWN) return { ok: false, message: "La nota es demasiado larga." };
  return { ok: true, markdown: value };
}

/** Crea una nota escrita a mano en una cita. */
export async function createManualNote(organizationId: string, appointmentId: string, input: { title?: unknown; markdown: string }): Promise<NoteWrite> {
  const appointment = await prisma.appointment.findFirst({ where: { id: appointmentId, organizationId }, select: { id: true, startTime: true, endTime: true } });
  if (!appointment) return { ok: false, status: 404, message: "Cita no encontrada" };
  const note = await prisma.granolaNote.create({
    data: {
      organizationId,
      granolaId: `manual:${randomUUID()}`,
      source: "MANUAL",
      title: cleanTitle(input.title, "Nota de la reunión"),
      startedAt: appointment.startTime,
      endedAt: appointment.endTime,
      summary: input.markdown,
      appointmentId: appointment.id,
      linkSource: "MANUAL",
    },
  });
  await applyActionItems(prisma, note.id, input.markdown, []);
  return { ok: true, noteId: note.id };
}

/** Edita título y/o texto de una nota manual o de Notion (las de Granola solo cambian desde Granola). */
export async function updateEditableNote(organizationId: string, noteId: string, input: { title?: unknown; markdown?: string }): Promise<NoteWrite> {
  const note = await prisma.granolaNote.findFirst({ where: { id: noteId, organizationId }, include: { items: { select: ITEM_SELECT } } });
  if (!note) return { ok: false, status: 404, message: "Nota no encontrada" };
  if (!isEditableNote(note.source)) return { ok: false, status: 403, message: "Las notas de Granola no se editan aquí: cámbialas en Granola." };
  await prisma.granolaNote.update({
    where: { id: note.id },
    data: { ...(input.title !== undefined ? { title: cleanTitle(input.title, note.title ?? "Nota de la reunión") } : {}), ...(input.markdown !== undefined ? { summary: input.markdown } : {}) },
  });
  if (input.markdown !== undefined) await applyActionItems(prisma, note.id, input.markdown, note.items);
  return { ok: true, noteId: note.id };
}

/** Borra una nota manual o de Notion. Las tareas que salieron de sus pasos se conservan. */
export async function deleteEditableNote(organizationId: string, noteId: string): Promise<NoteWrite> {
  const note = await prisma.granolaNote.findFirst({ where: { id: noteId, organizationId }, select: { id: true, source: true } });
  if (!note) return { ok: false, status: 404, message: "Nota no encontrada" };
  if (!isEditableNote(note.source)) return { ok: false, status: 403, message: "Las notas de Granola no se borran aquí." };
  await prisma.granolaNote.delete({ where: { id: note.id } });
  return { ok: true, noteId: note.id };
}

const MAX_BLOCKS = 300;
const MAX_DEPTH = 2;

async function readBlocks(env: { token: string }, blockId: string, depth: number, budget: { left: number; exhausted: boolean }): Promise<NotionBlock[]> {
  const blocks: NotionBlock[] = [];
  let cursor: string | null = null;
  do {
    const query: string = `/blocks/${blockId}/children?page_size=100${cursor ? `&start_cursor=${encodeURIComponent(cursor)}` : ""}`;
    const page = (await notionFetch(env, query)) as { results?: NotionBlock[]; has_more?: boolean; next_cursor?: string | null };
    for (const block of page.results ?? []) {
      if (budget.left <= 0) {
        budget.exhausted = true;
        return blocks;
      }
      budget.left--;
      if (block.has_children && block.id && depth < MAX_DEPTH) block.children = await readBlocks(env, block.id, depth + 1, budget);
      blocks.push(block);
    }
    cursor = page.has_more && page.next_cursor ? page.next_cursor : null;
  } while (cursor && budget.left > 0);
  if (cursor) budget.exhausted = true;
  return blocks;
}

/** Importa una página de Notion (por enlace o id) como nota de la cita. Reimportar la misma página la actualiza. */
export async function importNotionNote(organizationId: string, appointmentId: string, input: unknown): Promise<NoteWrite> {
  const pageId = parseNotionPageId(input);
  if (!pageId) return { ok: false, status: 400, message: "Pega el enlace de la página de Notion (o su id)." };
  const appointment = await prisma.appointment.findFirst({ where: { id: appointmentId, organizationId }, select: { id: true, startTime: true, endTime: true } });
  if (!appointment) return { ok: false, status: 404, message: "Cita no encontrada" };
  const env = await resolveNotionEnv(organizationId);
  if (!env) return { ok: false, status: 409, message: "Notion no está conectado: configúralo en Ajustes › Integraciones." };

  let title: string | null;
  let markdown: string;
  let url: string | null;
  try {
    const page = await notionFetch(env, `/pages/${pageId}`);
    title = notionPageTitle(page);
    url = typeof page.url === "string" ? page.url : null;
    const budget = { left: MAX_BLOCKS, exhausted: false };
    markdown = blocksToMarkdown(await readBlocks(env, pageId, 0, budget));
    if (budget.exhausted) {
      return { ok: false, status: 422, message: `La página de Notion es demasiado larga (más de ${MAX_BLOCKS} bloques); divídela para importarla.` };
    }
  } catch (error) {
    const detail = error instanceof Error ? error.message.slice(0, 200) : "";
    return { ok: false, status: 502, message: `Notion no pudo leer la página (¿está compartida con la integración?). ${detail}`.trim() };
  }
  if (!markdown) return { ok: false, status: 422, message: "La página de Notion está vacía." };
  markdown = markdown.slice(0, MAX_MARKDOWN);

  const granolaId = `notion:${pageId}`;
  const existing = await prisma.granolaNote.findUnique({
    where: { organizationId_granolaId: { organizationId, granolaId } },
    include: { items: { select: ITEM_SELECT } },
  });
  const data = { title: cleanTitle(title, "Página de Notion"), url, summary: markdown, appointmentId: appointment.id, linkSource: "MANUAL", startedAt: appointment.startTime, endedAt: appointment.endTime };
  const note = existing
    ? await prisma.granolaNote.update({ where: { id: existing.id }, data })
    : await prisma.granolaNote.create({ data: { ...data, organizationId, granolaId, source: "NOTION" } });
  await applyActionItems(prisma, note.id, markdown, existing?.items ?? []);
  return { ok: true, noteId: note.id };
}
