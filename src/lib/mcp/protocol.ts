import { z } from "zod";
import { ResourceTemplate, type McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { prisma } from "@/src/lib/db";
import { conversionReportText, loadSalesMetrics } from "@/src/lib/mcp/sales-metrics";

function single(value: string | string[]): string {
  return Array.isArray(value) ? value[0] ?? "" : value;
}

function contents(uri: string, data: unknown) {
  return {
    contents: [{ uri, mimeType: "application/json", text: JSON.stringify(data, null, 2) }],
  };
}

export function registerCrmProtocol(server: McpServer, organizationId: string) {
  server.registerResource(
    "deals-active",
    "crm://deals/active",
    {
      description: "Deals activos: no archivados y en una etapa ni ganada ni perdida.",
      mimeType: "application/json",
    },
    async (uri) => {
      const deals = await prisma.deal.findMany({
        where: { organizationId, isArchived: false, stage: { isWon: false, isLost: false } },
        orderBy: { updatedAt: "desc" },
        take: 100,
        select: {
          id: true,
          title: true,
          value: true,
          currency: true,
          stage: { select: { name: true } },
          contact: { select: { firstName: true, lastName: true, email: true } },
        },
      });
      return contents(uri.href, deals);
    },
  );

  server.registerResource(
    "deal",
    new ResourceTemplate("crm://deals/{id}", { list: undefined }),
    { description: "Detalle de un deal del CRM.", mimeType: "application/json" },
    async (uri, { id }) => {
      const deal = await prisma.deal.findFirst({
        where: { id: single(id), organizationId },
        include: {
          stage: { select: { id: true, name: true, isWon: true, isLost: true } },
          contact: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
          company: { select: { id: true, name: true } },
        },
      });
      if (!deal) throw new Error("Deal no encontrado");
      return contents(uri.href, deal);
    },
  );

  server.registerResource(
    "contact",
    new ResourceTemplate("crm://contacts/{id}", { list: undefined }),
    { description: "Detalle de un contacto del CRM.", mimeType: "application/json" },
    async (uri, { id }) => {
      const contact = await prisma.contact.findFirst({
        where: { id: single(id), organizationId },
        include: {
          company: { select: { id: true, name: true } },
          deals: {
            select: { id: true, title: true, value: true, currency: true, stage: { select: { name: true } } },
          },
        },
      });
      if (!contact) throw new Error("Contacto no encontrado");
      return contents(uri.href, contact);
    },
  );

  server.registerPrompt(
    "reporte_conversion",
    {
      description: "Informe de conversión con las cifras de get_sales_metrics.",
      argsSchema: {
        periodo: z.string().optional().describe("Etiqueta del periodo, por ejemplo 2026-11"),
      },
    },
    async ({ periodo }) => {
      const metrics = await loadSalesMetrics(organizationId);
      return {
        messages: [
          {
            role: "user" as const,
            content: { type: "text" as const, text: conversionReportText(metrics, periodo) },
          },
        ],
      };
    },
  );

  server.registerPrompt(
    "correo_seguimiento",
    {
      description: "Borrador de correo de seguimiento a partir de un deal.",
      argsSchema: { dealId: z.string().describe("ID del deal") },
    },
    async ({ dealId }) => {
      const deal = await prisma.deal.findFirst({
        where: { id: dealId, organizationId },
        include: {
          stage: { select: { name: true } },
          contact: { select: { firstName: true, lastName: true, email: true } },
          company: { select: { name: true } },
        },
      });
      const text = !deal
        ? `No hay un deal ${dealId} en esta organización. No redactes el correo.`
        : [
            "Redacta un correo de seguimiento breve, en español.",
            `Para: ${[deal.contact?.firstName, deal.contact?.lastName].filter(Boolean).join(" ") || "el contacto"}${deal.contact?.email ? ` <${deal.contact.email}>` : ""}`,
            `Deal: ${deal.title}`,
            `Etapa: ${deal.stage.name}`,
            deal.company?.name ? `Empresa: ${deal.company.name}` : "",
            deal.notes ? `Notas: ${deal.notes.slice(0, 500)}` : "",
            "No inventes datos que no estén aquí.",
          ]
            .filter(Boolean)
            .join("\n");
      return {
        messages: [{ role: "user" as const, content: { type: "text" as const, text } }],
      };
    },
  );
}
