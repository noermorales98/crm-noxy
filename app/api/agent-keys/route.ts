import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";
import { generateAgentKey } from "@/src/lib/mcp/agent-keys";

// Solo dueño o administrador de la organización activa. La clave completa se devuelve UNA vez, al crearla.
async function adminScope() {
  const session = await auth();
  const userId = session?.user?.id;
  const organizationId = session?.currentOrganizationId;
  if (!userId || !organizationId) return { error: NextResponse.json({ error: "No autorizado" }, { status: 401 }) } as const;
  const member = await prisma.organizationMember.findFirst({ where: { userId, organizationId, role: { in: ["OWNER", "ADMIN"] } }, select: { id: true } });
  if (!member) return { error: NextResponse.json({ error: "Solo el dueño o un administrador puede gestionar claves de agentes" }, { status: 403 }) } as const;
  return { userId, organizationId } as const;
}

export async function GET() {
  const scope = await adminScope();
  if ("error" in scope) return scope.error;
  const [keys, activity] = await Promise.all([
    prisma.agentKey.findMany({ where: { organizationId: scope.organizationId }, orderBy: { createdAt: "desc" }, select: { id: true, name: true, keyPrefix: true, revokedAt: true, lastUsedAt: true, createdAt: true } }),
    prisma.agentActivity.findMany({ where: { organizationId: scope.organizationId }, orderBy: { createdAt: "desc" }, take: 30, select: { id: true, tool: true, ok: true, error: true, createdAt: true, agentKey: { select: { name: true } } } }),
  ]);
  return NextResponse.json({ keys, activity });
}

export async function POST(req: Request) {
  const scope = await adminScope();
  if ("error" in scope) return scope.error;
  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name || name.length > 80) return NextResponse.json({ error: "Ponle un nombre de hasta 80 caracteres (por ejemplo: OpenClaw Kimi)." }, { status: 400 });
  const active = await prisma.agentKey.count({ where: { organizationId: scope.organizationId, revokedAt: null } });
  if (active >= 10) return NextResponse.json({ error: "Ya hay 10 claves activas; revoca alguna primero." }, { status: 400 });
  const { token, hash, prefix } = generateAgentKey();
  const key = await prisma.agentKey.create({ data: { name, keyHash: hash, keyPrefix: prefix, createdById: scope.userId, organizationId: scope.organizationId }, select: { id: true, name: true, keyPrefix: true } });
  return NextResponse.json({ ...key, token }, { status: 201 });
}
