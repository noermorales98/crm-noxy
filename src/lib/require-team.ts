import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";
import { canManageTeam, type RoleName } from "@/src/lib/permissions";

export async function requireTeamManager() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "No autorizado" }, { status: 401 }) };
  }
  const orgId = session.currentOrganizationId;
  if (!orgId) {
    return { error: NextResponse.json({ error: "Sin organización" }, { status: 400 }) };
  }

  const member = await prisma.organizationMember.findFirst({
    where: { userId: session.user.id, organizationId: orgId },
  });
  if (!member || !canManageTeam(member.role as RoleName)) {
    return { error: NextResponse.json({ error: "Sin permiso para gestionar el equipo" }, { status: 403 }) };
  }

  return { session, orgId, actor: member };
}
