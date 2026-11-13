/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { prisma } from "@/src/lib/db";
import { pushContentItem, removeContentItemEvent } from "@/src/lib/content-google-sync";
// @ts-expect-error Node's native TypeScript runner requires an explicit extension.
import { canonicalAction, gateWrite } from "./approval.ts";
// @ts-expect-error Node's native TypeScript runner requires an explicit extension.
import { CONTENT_TYPES, buildItemCreateData, buildItemUpdateData, monthRange } from "./content-input.ts";

function json(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}
function err(message: string) {
  return { content: [{ type: "text" as const, text: `Error: ${message}` }], isError: true };
}

const pagination = {
  limit: z.number().int().min(1).max(100).default(30).describe("Máximo de resultados (1-100)"),
  offset: z.number().int().min(0).default(0).describe("Resultados a saltar (paginación)"),
};
const STATUS = z.enum(["pendiente", "en_edicion", "editado", "subido"]);
const TYPE = z.enum(CONTENT_TYPES as unknown as [string, ...string[]]);
const DAY = z.string().describe("Día en formato YYYY-MM-DD (o ISO 8601 con hora)");

// Sin enlace público ni claves de WhatsApp: son secretos y no deben salir por el MCP.
const clientSelect = {
  id: true,
  name: true,
  kind: true,
  description: true,
  color: true,
  isActive: true,
  reminderHour: true,
  reminderMinute: true,
  reminderDaysBefore: true,
  createdAt: true,
  _count: { select: { items: true, phones: true } },
} as const;

const itemInclude = {
  client: { select: { id: true, name: true, color: true } },
  editorNotes: { orderBy: { createdAt: "desc" as const }, select: { id: true, body: true, createdAt: true } },
};

/** Gestión de contenido: clientes de marketing (/contenido/clientes) y calendario (/contenido/general). */
export function registerContentTools(server: McpServer, organizationId: string) {
  const org = organizationId;

  // Nunca falla la operación por Google Calendar: la pieza ya está guardada.
  const pushToGoogle = async (itemId: string) => {
    try {
      await pushContentItem(org, itemId);
    } catch (error) {
      console.error("[mcp content] google sync:", error);
    }
  };

  server.registerTool(
    "list_content_clients",
    {
      description:
        "Lista los clientes y marcas de gestión de contenido (/contenido/clientes), con el número de piezas. No confundir con list_clients (facturación recurrente).",
      inputSchema: {
        search: z.string().optional().describe("Buscar en el nombre"),
        isActive: z.boolean().optional(),
        kind: z.enum(["cliente", "marca"]).optional(),
        ...pagination,
      },
    },
    async ({ search, isActive, kind, limit, offset }) => {
      const where: any = { organizationId: org };
      if (search) where.name = { contains: search };
      if (isActive !== undefined) where.isActive = isActive;
      if (kind) where.kind = kind;
      const [total, clients] = await Promise.all([
        prisma.contentClient.count({ where }),
        prisma.contentClient.findMany({ where, orderBy: { name: "asc" }, take: limit, skip: offset, select: clientSelect }),
      ]);
      return json({ total, clients });
    },
  );

  server.registerTool(
    "get_content_client",
    {
      description: "Detalle de un cliente de contenido: descripción, contexto de marca (voz, audiencia, tono), recordatorios y próximas piezas.",
      inputSchema: { id: z.string().describe("ID del cliente de contenido (list_content_clients)") },
    },
    async ({ id }) => {
      const client = await prisma.contentClient.findFirst({
        where: { id, organizationId: org },
        select: { ...clientSelect, context: true },
      });
      if (!client) return err("Cliente de contenido no encontrado");
      const upcoming = await prisma.contentItem.findMany({
        where: { clientId: id, organizationId: org, date: { gte: new Date(Date.now() - 24 * 3600 * 1000) } },
        orderBy: { date: "asc" },
        take: 10,
        select: { id: true, date: true, type: true, title: true, publishStatus: true },
      });
      return json({ ...client, upcoming });
    },
  );

  server.registerTool(
    "list_content_items",
    {
      description:
        "Lista las piezas del calendario de contenido (/contenido/general). Filtra por mes, rango de fechas, cliente, estado o tipo. Ordenadas por fecha.",
      inputSchema: {
        month: z.string().optional().describe("Mes YYYY-MM (alternativa a from/to)"),
        from: DAY.optional().describe("Desde (incluido)"),
        to: DAY.optional().describe("Hasta (excluido)"),
        clientId: z.string().optional(),
        publishStatus: STATUS.optional(),
        type: TYPE.optional(),
        ...pagination,
      },
    },
    async ({ month, from, to, clientId, publishStatus, type, limit, offset }) => {
      const where: any = { organizationId: org };
      if (month) {
        const range = monthRange(month);
        if (!range) return err("Mes inválido, usa YYYY-MM");
        where.date = { gte: range.from, lt: range.to };
      } else if (from || to) {
        const gte = from ? new Date(from.length === 10 ? `${from}T00:00:00Z` : from) : undefined;
        const lt = to ? new Date(to.length === 10 ? `${to}T00:00:00Z` : to) : undefined;
        if ((gte && Number.isNaN(gte.getTime())) || (lt && Number.isNaN(lt.getTime()))) return err("Fecha inválida");
        where.date = { ...(gte && { gte }), ...(lt && { lt }) };
      }
      if (clientId) where.clientId = clientId;
      if (publishStatus) where.publishStatus = publishStatus;
      if (type) where.type = type;
      const [total, items] = await Promise.all([
        prisma.contentItem.count({ where }),
        prisma.contentItem.findMany({
          where,
          orderBy: [{ date: "asc" }, { createdAt: "asc" }],
          take: limit,
          skip: offset,
          select: {
            id: true, date: true, time: true, type: true, title: true, publishStatus: true, uploadedAt: true,
            reminderEnabled: true, reminderDaysBefore: true, client: { select: { id: true, name: true, color: true } },
          },
        }),
      ]);
      return json({ total, items });
    },
  );

  server.registerTool(
    "get_content_item",
    {
      description: "Detalle completo de una pieza del calendario: gancho, guion, caption, CTA, tips, notas internas y notas de la editora.",
      inputSchema: { id: z.string().describe("ID de la pieza (list_content_items)") },
    },
    async ({ id }) => {
      const item = await prisma.contentItem.findFirst({ where: { id, organizationId: org }, include: itemInclude });
      return item ? json(item) : err("Pieza no encontrada");
    },
  );

  server.registerTool(
    "create_content_item",
    {
      description: "Agrega una pieza al calendario de contenido de un cliente. Se sincroniza con Google Calendar si está conectado.",
      inputSchema: {
        clientId: z.string().describe("ID del cliente de contenido (list_content_clients)"),
        title: z.string().describe("Título de la pieza"),
        date: DAY,
        type: TYPE.optional().describe("video | reel | flyer | historia | entrega | edicion (default video)"),
        time: z.string().optional().describe('Hora, p. ej. "11:00 am"'),
        hook: z.string().optional(),
        hooksAlt: z.array(z.string()).optional().describe("Ganchos alternativos"),
        script: z.string().optional(),
        caption: z.string().optional(),
        cta: z.string().optional(),
        tips: z.string().optional().describe("Sugerencias para grabar"),
        note: z.string().optional().describe("Nota interna del equipo"),
        publishStatus: STATUS.optional(),
        reminderEnabled: z.boolean().optional().describe("Recordatorio por WhatsApp"),
        reminderDaysBefore: z.number().int().min(0).max(30).optional(),
      },
    },
    async ({ clientId, ...input }) => {
      const client = await prisma.contentClient.findFirst({
        where: { id: clientId, organizationId: org },
        select: { id: true, reminderDaysBefore: true },
      });
      if (!client) return err("Cliente de contenido no encontrado");
      const built = buildItemCreateData(input, client.reminderDaysBefore);
      if (!built.ok) return err(built.error);
      const item = await prisma.contentItem.create({
        data: { ...built.data, clientId, organizationId: org } as any,
        include: itemInclude,
      });
      await pushToGoogle(item.id);
      return json(item);
    },
  );

  server.registerTool(
    "update_content_item",
    {
      description:
        "Edita una pieza del calendario: solo cambian los campos enviados (null borra un texto). Para mover la pieza cambia `date`; para cambiar su avance, `publishStatus`. `editorNote` agrega una nota nueva de la editora.",
      inputSchema: {
        id: z.string().describe("ID de la pieza (list_content_items)"),
        title: z.string().optional(),
        date: DAY.optional(),
        type: TYPE.optional(),
        time: z.string().nullable().optional(),
        hook: z.string().nullable().optional(),
        hooksAlt: z.array(z.string()).optional(),
        script: z.string().nullable().optional(),
        caption: z.string().nullable().optional(),
        cta: z.string().nullable().optional(),
        tips: z.string().nullable().optional(),
        note: z.string().nullable().optional(),
        editorNote: z.string().optional().describe("Agrega una nota de la editora al historial"),
        publishStatus: STATUS.optional(),
        reminderEnabled: z.boolean().optional(),
        reminderDaysBefore: z.number().int().min(0).max(30).optional(),
      },
    },
    async ({ id, editorNote, ...input }) => {
      const existing = await prisma.contentItem.findFirst({ where: { id, organizationId: org } });
      if (!existing) return err("Pieza no encontrada");
      const data = buildItemUpdateData(input, existing);
      const note = editorNote?.trim();
      if (note) {
        await prisma.contentItemEditorNote.create({ data: { itemId: id, body: note } });
        data.editorNote = note;
      }
      if (!Object.keys(data).length) return err("No se envió ningún cambio válido");
      const item = await prisma.contentItem.update({ where: { id }, data, include: itemInclude });
      await pushToGoogle(item.id);
      return json(item);
    },
  );

  server.registerTool(
    "delete_content_item",
    {
      description:
        "Elimina una pieza del calendario (y su evento de Google Calendar). Acción destructiva: exige approvalToken que devuelve la página de confirmación humana.",
      inputSchema: {
        id: z.string().describe("ID de la pieza (list_content_items)"),
        approvalToken: z.string().optional().describe("Token que devuelve la página de confirmación humana"),
      },
    },
    async ({ id, approvalToken }) => {
      const existing = await prisma.contentItem.findFirst({
        where: { id, organizationId: org },
        select: { id: true, title: true, date: true, googleEventId: true },
      });
      if (!existing) return err("Pieza no encontrada");
      const action = canonicalAction("delete_content_item", { id });
      const day = existing.date.toISOString().slice(0, 10);
      const gated = gateWrite(action, `Eliminar la pieza «${existing.title}» del ${day}.`, approvalToken);
      if (!gated.ok) return gated.result;
      try {
        await removeContentItemEvent(org, existing.googleEventId);
      } catch (error) {
        console.error("[mcp content] google delete:", error);
      }
      await prisma.contentItem.delete({ where: { id } });
      return json({ ok: true, deleted: id });
    },
  );
}
