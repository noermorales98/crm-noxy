/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { prisma } from "@/src/lib/db";
import { createSubAccount } from "@/src/lib/organization-service";
import { loadAgencyCards } from "@/src/lib/agency-service";
import { parseOrganizationInput } from "@/src/lib/organizations";
import { BRAND_COLORS, BRAND_ICON_KEYS, parseOrgBrandPatch } from "@/src/lib/org-brand";
import { CRM_THEMES } from "@/src/lib/crm-themes";
// @ts-expect-error Node's native TypeScript runner requires an explicit extension.
import { connectorUrl } from "./org-scope.ts";
import { loadMcpAccess } from "./org-access";
import { currentMcpOrigin } from "./client-context";

function json(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}
function err(message: string) {
  return { content: [{ type: "text" as const, text: `Error: ${message}` }], isError: true };
}

/**
 * Clientes (sub-cuentas) del CRM: una organización por cliente, con su propio pipeline, contactos y formularios.
 * Cada conexión del MCP trabaja con UNA organización; estas herramientas listan las del dueño y devuelven el enlace de conector
 * (`/mcp?org=<id>`) para trabajar dentro de cada una. No hay herramienta para borrar una organización: arrastraría todos sus datos.
 */
export function registerOrgTools(server: McpServer, organizationId: string, baseOrganizationId: string) {
  server.registerTool(
    "list_organizations",
    {
      description: "Lista las organizaciones (clientes / sub-cuentas) del dueño del CRM, con su identidad (color, icono, tema) y el enlace de conector para trabajar dentro de cada una. La actual va marcada.",
      inputSchema: {},
    },
    async () => {
      const access = await loadMcpAccess(baseOrganizationId);
      const origin = currentMcpOrigin();
      return json({
        current: organizationId,
        organizations: access.organizations.map((o) => ({
          ...o,
          current: o.id === organizationId,
          isBase: o.id === baseOrganizationId,
          connectorUrl: connectorUrl(origin, baseOrganizationId, o.id),
        })),
      });
    },
  );

  server.registerTool(
    "get_organization",
    {
      description: "Datos de la organización con la que trabaja esta conexión: nombre, zona horaria, días de auto-archivo e identidad (color, icono, tema).",
      inputSchema: {},
    },
    async () => {
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { id: true, name: true, timezone: true, autoArchiveDays: true, brandColor: true, brandIcon: true, themeId: true, createdAt: true },
      });
      return org ? json({ ...org, colors: BRAND_COLORS, icons: BRAND_ICON_KEYS, themes: CRM_THEMES.map((t) => ({ id: t.id, label: t.label })) }) : err("Organización no encontrada");
    },
  );

  server.registerTool(
    "create_organization",
    {
      description: "Crea un cliente nuevo (sub-cuenta) con su pipeline de ventas, pipeline editorial y plantillas de proyecto. Devuelve su enlace de conector para trabajar dentro.",
      inputSchema: {
        name: z.string().describe("Nombre del cliente"),
        timezone: z.string().optional().describe("Zona horaria IANA, p. ej. America/Cancun (por defecto Cancún)"),
      },
    },
    async (input) => {
      const parsed = parseOrganizationInput(input);
      if (!parsed.ok) return err(parsed.error);
      const access = await loadMcpAccess(baseOrganizationId);
      if (!access.operatorUserId) return err("La organización base no tiene dueño");
      const { organization } = await createSubAccount(access.operatorUserId, parsed.value);
      return json({ id: organization.id, name: organization.name, timezone: organization.timezone, connectorUrl: connectorUrl(currentMcpOrigin(), baseOrganizationId, organization.id) });
    },
  );

  server.registerTool(
    "update_organization",
    {
      description: "Edita la organización actual: nombre, zona horaria, días de auto-archivo de ganados y su identidad (color hex, icono, tema). Con null en brandColor, brandIcon o themeId vuelve a la identidad de Noxy / al tema de cada persona.",
      inputSchema: {
        name: z.string().optional(),
        timezone: z.string().optional(),
        autoArchiveDays: z.number().int().min(0).max(365).optional().describe("0 = nunca archivar"),
        brandColor: z.string().nullable().optional().describe("Hex, p. ej. #0E9F9A"),
        brandIcon: z.enum(BRAND_ICON_KEYS).nullable().optional(),
        themeId: z.string().nullable().optional().describe("Id de tema (get_organization lista los válidos)"),
      },
    },
    async ({ name, timezone, autoArchiveDays, ...brand }) => {
      const data: any = {};
      if (name !== undefined || timezone !== undefined) {
        const current = await prisma.organization.findUnique({ where: { id: organizationId }, select: { name: true, timezone: true } });
        const parsed = parseOrganizationInput({ name: name ?? current?.name, timezone: timezone ?? current?.timezone });
        if (!parsed.ok) return err(parsed.error);
        if (name !== undefined) data.name = parsed.value.name;
        if (timezone !== undefined) data.timezone = parsed.value.timezone;
      }
      if (autoArchiveDays !== undefined) data.autoArchiveDays = autoArchiveDays;
      const brandPatch = parseOrgBrandPatch(Object.fromEntries(Object.entries(brand).filter(([, v]) => v !== undefined)));
      if (!brandPatch.ok) return err(brandPatch.error);
      Object.assign(data, brandPatch.patch);
      if (!Object.keys(data).length) return err("No hay nada que cambiar");
      const org = await prisma.organization.update({ where: { id: organizationId }, data, select: { id: true, name: true, timezone: true, autoArchiveDays: true, brandColor: true, brandIcon: true, themeId: true } });
      return json(org);
    },
  );

  server.registerTool(
    "get_agency_overview",
    {
      description: "Panel de agencia: una tarjeta por cliente (sub-cuenta) con deals abiertos, ganados del mes, tareas vencidas, cobros pendientes y último cierre mensual. Los que piden más atención van primero.",
      inputSchema: {},
    },
    async () => {
      const access = await loadMcpAccess(baseOrganizationId);
      if (!access.operatorUserId) return err("La organización base no tiene dueño");
      return json({ cards: await loadAgencyCards(access.operatorUserId, organizationId) });
    },
  );
}
