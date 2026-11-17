import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { granolaScope } from "@/src/lib/granola-auth";
import { checkGranolaApiKey, sealSecret } from "@/src/lib/granola-service";
import { parseGranolaApiKey, viewOfConfig } from "@/src/lib/granola-view";

const viewFor = async (organizationId: string) => viewOfConfig(await prisma.granolaConfig.findUnique({ where: { organizationId } }));

export async function GET() {
  const access = await granolaScope();
  if ("error" in access) return access.error;
  return NextResponse.json(await viewFor(access.scope.organizationId));
}

/** Conecta con una clave API: se valida contra Granola y solo entonces se guarda (cifrada). */
export async function PUT(req: Request) {
  const access = await granolaScope({ admin: true });
  if ("error" in access) return access.error;
  const { organizationId } = access.scope;

  const body = await req.json().catch(() => null);
  const parsed = parseGranolaApiKey(body?.apiKey);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const checked = await checkGranolaApiKey(parsed.key);
  if (!checked.ok) return NextResponse.json({ error: checked.message }, { status: 400 });

  const credentials = {
    mode: "API_KEY",
    apiKey: sealSecret(parsed.key),
    mcpClientInfo: null,
    mcpTokens: null,
    mcpVerifier: null,
    mcpState: null,
    status: "CONNECTED",
    lastSyncError: null,
    lastSyncAt: null,
    lastSyncCount: 0,
  };
  await prisma.granolaConfig.upsert({ where: { organizationId }, create: { organizationId, ...credentials }, update: credentials });
  return NextResponse.json(await viewFor(organizationId));
}

/** Desconecta: borra credenciales y estado de conexión. Las sesiones ya guardadas en las citas se conservan. */
export async function DELETE() {
  const access = await granolaScope({ admin: true });
  if ("error" in access) return access.error;
  await prisma.granolaConfig.deleteMany({ where: { organizationId: access.scope.organizationId } });
  return NextResponse.json(await viewFor(access.scope.organizationId));
}
