import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";
import { appSecretKey, encryptSecret } from "@/src/lib/secret-box";
import { parseIntegrationInput, redactIntegration } from "@/src/lib/mcp-connections";

async function organizationOf() {
  const session = await auth();
  if (!session?.user) return { error: NextResponse.json({ error: "No autorizado" }, { status: 401 }) } as const;
  const organizationId = (session as { currentOrganizationId?: string }).currentOrganizationId;
  if (!organizationId) return { error: NextResponse.json({ error: "Sin organización" }, { status: 400 }) } as const;
  return { organizationId } as const;
}

export async function GET() {
  const scope = await organizationOf();
  if ("error" in scope) return scope.error;
  const rows = await prisma.mcpIntegration.findMany({ where: { organizationId: scope.organizationId }, orderBy: { name: "asc" } });
  return NextResponse.json({ integrations: rows.map(redactIntegration) });
}

export async function POST(req: Request) {
  const scope = await organizationOf();
  if ("error" in scope) return scope.error;
  const body = await req.json().catch(() => null);

  const parsed = parseIntegrationInput(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { authToken, ...rest } = parsed.value;
  try {
    const created = await prisma.mcpIntegration.create({
      data: { ...rest, authToken: authToken ? encryptSecret(authToken, appSecretKey()) : null, organizationId: scope.organizationId },
    });
    return NextResponse.json(redactIntegration(created), { status: 201 });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") return NextResponse.json({ error: "Ya existe una conexión con ese nombre." }, { status: 409 });
    throw error;
  }
}
