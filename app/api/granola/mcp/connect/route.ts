import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { granolaScope } from "@/src/lib/granola-auth";
import { GranolaError } from "@/src/lib/granola-client";
import { beginMcpAuthorization, createMcpProvider } from "@/src/lib/granola-mcp";
import { granolaAuthStore, granolaRedirectUrl } from "@/src/lib/granola-service";

/** Inicia la conexión por MCP: devuelve la URL de Granola a la que hay que llevar al usuario para autorizar. */
export async function POST(req: Request) {
  const access = await granolaScope({ admin: true });
  if ("error" in access) return access.error;
  const { organizationId } = access.scope;

  // Una conexión que ya funciona no se destruye hasta que la nueva se confirme: solo se limpia el estado de autorización.
  // Sin conexión previa se crea una PENDIENTE, que el callback confirma o borra.
  const existing = await prisma.granolaConfig.findUnique({ where: { organizationId }, select: { id: true } });
  if (existing) {
    await prisma.granolaConfig.update({ where: { organizationId }, data: { mcpTokens: null, mcpVerifier: null, mcpState: null } });
  } else {
    await prisma.granolaConfig.create({ data: { organizationId, mode: "MCP", status: "PENDING" } });
  }
  const abandon = async () => {
    await prisma.granolaConfig.deleteMany({ where: { organizationId, status: "PENDING" } });
    await prisma.granolaConfig.updateMany({ where: { organizationId }, data: { mcpVerifier: null, mcpState: null } });
  };

  let authorizationUrl: URL | null = null;
  try {
    const provider = createMcpProvider(granolaAuthStore(organizationId), granolaRedirectUrl(req.url), (url) => {
      authorizationUrl = url;
    });
    await beginMcpAuthorization(provider);
  } catch (error) {
    await abandon();
    const message = error instanceof GranolaError ? error.message : "No se pudo iniciar la conexión con Granola.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
  if (!authorizationUrl) {
    await abandon();
    return NextResponse.json({ error: "Granola no devolvió la dirección de autorización." }, { status: 502 });
  }
  return NextResponse.json({ url: (authorizationUrl as URL).toString() });
}
