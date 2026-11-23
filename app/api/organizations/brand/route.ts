import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";
import { canManageTeam, type RoleName } from "@/src/lib/permissions";
import { parseOrgBrandPatch } from "@/src/lib/org-brand";

// Identidad de la empresa actual (color, icono y tema). Solo OWNER o ADMIN pueden cambiarla.

export async function GET() {
  const session = await auth();
  const orgId = (session as { currentOrganizationId?: string | null } | null)?.currentOrganizationId;
  if (!session?.user?.id || !orgId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { name: true, brandColor: true, brandIcon: true, themeId: true } });
  if (!org) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  return NextResponse.json(org);
}

export async function PATCH(req: Request) {
  const session = await auth();
  const orgId = (session as { currentOrganizationId?: string | null } | null)?.currentOrganizationId;
  const role = (session as { role?: RoleName | null } | null)?.role;
  if (!session?.user?.id || !orgId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!canManageTeam(role)) return NextResponse.json({ error: "Solo el dueño o un administrador puede cambiar la identidad de la empresa" }, { status: 403 });

  const parsed = parseOrgBrandPatch(await req.json().catch(() => null));
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  if (!Object.keys(parsed.patch).length) return NextResponse.json({ error: "No hay nada que cambiar" }, { status: 400 });

  const org = await prisma.organization.update({
    where: { id: orgId },
    data: parsed.patch,
    select: { name: true, brandColor: true, brandIcon: true, themeId: true },
  });
  return NextResponse.json(org);
}
