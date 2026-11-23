import { prisma } from "@/src/lib/db";

/**
 * El operador del MCP es el OWNER más antiguo de la organización base; las organizaciones permitidas son aquellas donde ese
 * mismo usuario también es OWNER (sus sub-cuentas). Es lo que acota `?org=` y lo que usan las herramientas de organizaciones.
 */
export async function loadMcpAccess(baseOrganizationId: string) {
  const owner = await prisma.organizationMember.findFirst({
    where: { organizationId: baseOrganizationId, role: "OWNER" },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { userId: true },
  });
  if (!owner) return { operatorUserId: null as string | null, organizations: [] as OrgRow[] };
  const rows = await prisma.organizationMember.findMany({
    where: { userId: owner.userId, role: "OWNER" },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { organization: { select: { id: true, name: true, timezone: true, brandColor: true, brandIcon: true, themeId: true } } },
  });
  return { operatorUserId: owner.userId, organizations: rows.map((r) => r.organization) };
}

export type OrgRow = { id: string; name: string; timezone: string; brandColor: string | null; brandIcon: string | null; themeId: string | null };
