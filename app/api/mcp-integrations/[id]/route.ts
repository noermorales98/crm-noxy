import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";
import { appSecretKey, encryptSecret } from "@/src/lib/secret-box";
import { parseIntegrationInput, redactIntegration } from "@/src/lib/mcp-connections";

async function ownedBy(id: string) {
  const session = await auth();
  if (!session?.user) return { error: NextResponse.json({ error: "No autorizado" }, { status: 401 }) } as const;
  const organizationId = (session as { currentOrganizationId?: string }).currentOrganizationId;
  if (!organizationId) return { error: NextResponse.json({ error: "Sin organización" }, { status: 400 }) } as const;
  const existing = await prisma.mcpIntegration.findFirst({ where: { id, organizationId } });
  if (!existing) return { error: NextResponse.json({ error: "No encontrada" }, { status: 404 }) } as const;
  return { existing } as const;
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const scope = await ownedBy(id);
  if ("error" in scope) return scope.error;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const data: Record<string, unknown> = {};
  if (typeof body.enabled === "boolean") data.enabled = body.enabled;
  // Cualquier otro campo se valida con las mismas reglas del alta, sobre el registro actual.
  const touchesDetails = ["name", "url", "transport", "note", "category", "authToken"].some((key) => key in body);
  if (touchesDetails) {
    const merged = { name: scope.existing.name, url: scope.existing.url, transport: scope.existing.transport, note: scope.existing.note, category: scope.existing.category, ...body };
    const parsed = parseIntegrationInput(merged);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const { authToken, ...rest } = parsed.value;
    Object.assign(data, rest);
    // Token: vacío no lo cambia; «null» explícito lo borra; texto lo reemplaza (cifrado).
    if (body.authToken === null) data.authToken = null;
    else if (authToken) data.authToken = encryptSecret(authToken, appSecretKey());
  }
  try {
    const updated = await prisma.mcpIntegration.update({ where: { id }, data });
    return NextResponse.json(redactIntegration(updated));
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") return NextResponse.json({ error: "Ya existe una conexión con ese nombre." }, { status: 409 });
    throw error;
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const scope = await ownedBy(id);
  if ("error" in scope) return scope.error;
  await prisma.mcpIntegration.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
