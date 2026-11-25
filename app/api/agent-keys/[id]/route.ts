import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";

// Revocar: la clave deja de funcionar de inmediato (el MCP la busca en cada llamada). No afecta al resto de accesos.
export async function DELETE(_req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const session = await auth();
  const userId = session?.user?.id;
  const organizationId = session?.currentOrganizationId;
  if (!userId || !organizationId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const member = await prisma.organizationMember.findFirst({ where: { userId, organizationId, role: { in: ["OWNER", "ADMIN"] } }, select: { id: true } });
  if (!member) return NextResponse.json({ error: "Solo el dueño o un administrador puede revocar claves" }, { status: 403 });
  const { count } = await prisma.agentKey.updateMany({ where: { id, organizationId, revokedAt: null }, data: { revokedAt: new Date() } });
  if (count === 0) return NextResponse.json({ error: "Clave no encontrada o ya revocada" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
