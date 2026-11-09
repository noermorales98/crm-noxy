import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { prisma } from "@/src/lib/db";
import { resolveNotionEnv, type NotionEnv } from "@/src/lib/mcp/notion-credentials";
// @ts-expect-error Node's native TypeScript runner requires an explicit extension.
import { canonicalAction, definedRecord, gateWrite } from "./approval.ts";
// @ts-expect-error Node's native TypeScript runner requires an explicit extension.
import { leadToNotionProperties, type LeadNotionFields } from "./notion-map.ts";

const NOTION = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";

function json(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

function err(message: string) {
  return { content: [{ type: "text" as const, text: `Error: ${message}` }], isError: true as const };
}

async function notionFetch(env: NotionEnv, path: string, init?: { method?: string; body?: string }) {
  const response = await fetch(`${NOTION}${path}`, {
    method: init?.method ?? "GET",
    headers: {
      Authorization: `Bearer ${env.token}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
    },
    body: init?.body,
  });
  const body = (await response.json().catch(() => ({}))) as { message?: string; id?: string; url?: string };
  if (!response.ok) throw new Error(body.message || `Notion respondió ${response.status}`);
  return body as Record<string, unknown>;
}

function plainProperty(property: unknown): string | number | null {
  if (!property || typeof property !== "object") return null;
  const value = property as {
    type?: string;
    title?: { plain_text?: string }[];
    rich_text?: { plain_text?: string }[];
    email?: string | null;
    phone_number?: string | null;
    number?: number | null;
  };
  if (value.type === "title") return value.title?.map((item) => item.plain_text ?? "").join("") ?? "";
  if (value.type === "rich_text") return value.rich_text?.map((item) => item.plain_text ?? "").join("") ?? "";
  if (value.type === "email") return value.email ?? null;
  if (value.type === "phone_number") return value.phone_number ?? null;
  if (value.type === "number") return value.number ?? null;
  return null;
}

function slimPage(page: Record<string, unknown>) {
  const properties = page.properties;
  const flat: Record<string, string | number | null> = {};
  if (properties && typeof properties === "object") {
    for (const [name, property] of Object.entries(properties)) {
      flat[name] = plainProperty(property);
    }
  }
  return { id: page.id, url: page.url, properties: flat };
}

const pageFields = {
  title: z.string().min(1).describe("Título de la página (propiedad Name)"),
  email: z.string().optional(),
  phone: z.string().optional(),
  value: z.number().optional(),
  stage: z.string().optional(),
  source: z.string().optional(),
  dealId: z.string().optional().describe("ID del deal en el CRM, si la página corresponde a uno"),
  approvalToken: z.string().optional().describe("Token que devuelve la página de confirmación humana"),
};

function fieldsOf(input: {
  title: string;
  email?: string;
  phone?: string;
  value?: number;
  stage?: string;
  source?: string;
  dealId?: string;
}): LeadNotionFields {
  return {
    title: input.title,
    email: input.email,
    phone: input.phone,
    value: input.value,
    stage: input.stage,
    source: input.source,
    dealId: input.dealId,
  };
}

export function registerNotionTools(server: McpServer, organizationId: string) {
  const missing = () => err("Notion no está configurado. Agrega el token y la base de leads en Ajustes › Integraciones.");

  server.registerTool(
    "notion_search",
    {
      description:
        "Busca páginas en la base de leads de Notion. La base debe tener una propiedad de título llamada Name.",
      inputSchema: {
        search: z.string().optional().describe("Texto a buscar en el título"),
        limit: z.number().int().min(1).max(20).default(10),
      },
    },
    async ({ search, limit }) => {
      const env = await resolveNotionEnv(organizationId);
      if (!env) return missing();
      try {
        const body: Record<string, unknown> = { page_size: limit };
        if (search) body.filter = { property: "Name", title: { contains: search } };
        const result = await notionFetch(env, `/databases/${env.databaseId}/query`, {
          method: "POST",
          body: JSON.stringify(body),
        });
        const results = Array.isArray(result.results) ? result.results : [];
        return json(results.map((page) => slimPage(page as Record<string, unknown>)));
      } catch (error) {
        return err(error instanceof Error ? error.message : "Notion no respondió");
      }
    },
  );

  server.registerTool(
    "notion_get_page",
    {
      description: "Lee una página de Notion por su id.",
      inputSchema: { pageId: z.string().min(1) },
    },
    async ({ pageId }) => {
      const env = await resolveNotionEnv(organizationId);
      if (!env) return missing();
      try {
        const page = await notionFetch(env, `/pages/${pageId}`);
        return json(slimPage(page));
      } catch (error) {
        return err(error instanceof Error ? error.message : "Notion no respondió");
      }
    },
  );

  server.registerTool(
    "notion_create_page",
    {
      description:
        "Crea una página en la base de leads de Notion. Exige approvalToken. Propiedades: Name, Email, Phone, Value, Stage, Source, CRM Deal ID.",
      inputSchema: pageFields,
    },
    async ({ approvalToken, ...input }) => {
      const env = await resolveNotionEnv(organizationId);
      if (!env) return missing();
      const fields = fieldsOf(input);
      const action = canonicalAction("notion_create_page", definedRecord({ ...fields }));
      const gated = gateWrite(action, `Crear en Notion la página «${fields.title}».`, approvalToken);
      if (!gated.ok) return gated.result;
      try {
        const page = await notionFetch(env, "/pages", {
          method: "POST",
          body: JSON.stringify({
            parent: { database_id: env.databaseId },
            properties: leadToNotionProperties(fields),
          }),
        });
        if (fields.dealId && typeof page.id === "string") {
          await prisma.deal.updateMany({
            where: { id: fields.dealId, organizationId },
            data: { notionPageId: page.id },
          });
        }
        return json(slimPage(page));
      } catch (error) {
        return err(error instanceof Error ? error.message : "Notion no respondió");
      }
    },
  );

  server.registerTool(
    "notion_update_page",
    {
      description: "Actualiza las propiedades de una página de Notion. Exige approvalToken.",
      inputSchema: { pageId: z.string().min(1), ...pageFields },
    },
    async ({ pageId, approvalToken, ...input }) => {
      const env = await resolveNotionEnv(organizationId);
      if (!env) return missing();
      const fields = fieldsOf(input);
      const action = canonicalAction("notion_update_page", definedRecord({ pageId, ...fields }));
      const gated = gateWrite(action, `Actualizar en Notion la página ${pageId} («${fields.title}»).`, approvalToken);
      if (!gated.ok) return gated.result;
      try {
        const page = await notionFetch(env, `/pages/${pageId}`, {
          method: "PATCH",
          body: JSON.stringify({ properties: leadToNotionProperties(fields) }),
        });
        return json(slimPage(page));
      } catch (error) {
        return err(error instanceof Error ? error.message : "Notion no respondió");
      }
    },
  );

  server.registerTool(
    "sync_lead_to_notion",
    {
      description:
        "Crea o actualiza en Notion la página del deal indicado. Exige approvalToken. Si el deal ya tiene página, la actualiza.",
      inputSchema: {
        dealId: z.string().min(1),
        approvalToken: z.string().optional().describe("Token que devuelve la página de confirmación humana"),
      },
    },
    async ({ dealId, approvalToken }) => {
      const env = await resolveNotionEnv(organizationId);
      if (!env) return missing();
      const deal = await prisma.deal.findFirst({
        where: { id: dealId, organizationId },
        include: {
          stage: { select: { name: true } },
          contact: { select: { firstName: true, lastName: true, email: true, phone: true } },
        },
      });
      if (!deal) return err("Deal no encontrado");
      const fields: LeadNotionFields = {
        title: deal.title,
        email: deal.contact?.email,
        phone: deal.contact?.phone,
        value: deal.value,
        stage: deal.stage.name,
        source: deal.source,
        dealId: deal.id,
      };
      const action = canonicalAction("sync_lead_to_notion", { dealId: deal.id, updatedAt: deal.updatedAt.toISOString() });
      const gated = gateWrite(
        action,
        `Sincronizar el deal «${deal.title}» (${deal.stage.name}) con Notion.`,
        approvalToken,
      );
      if (!gated.ok) return gated.result;
      try {
        let pageId = deal.notionPageId;
        if (!pageId) {
          const found = await notionFetch(env, `/databases/${env.databaseId}/query`, {
            method: "POST",
            body: JSON.stringify({
              page_size: 1,
              filter: { property: "CRM Deal ID", rich_text: { equals: deal.id } },
            }),
          });
          const first = Array.isArray(found.results) ? (found.results[0] as { id?: string } | undefined) : undefined;
          pageId = first?.id ?? null;
        }
        const page = pageId
          ? await notionFetch(env, `/pages/${pageId}`, {
              method: "PATCH",
              body: JSON.stringify({ properties: leadToNotionProperties(fields) }),
            })
          : await notionFetch(env, "/pages", {
              method: "POST",
              body: JSON.stringify({
                parent: { database_id: env.databaseId },
                properties: leadToNotionProperties(fields),
              }),
            });
        if (typeof page.id !== "string") return err("Notion no devolvió el id de la página");
        await prisma.deal.updateMany({
          where: { id: deal.id, organizationId },
          data: { notionPageId: page.id },
        });
        return json(slimPage(page));
      } catch (error) {
        return err(error instanceof Error ? error.message : "Notion no respondió");
      }
    },
  );
}
