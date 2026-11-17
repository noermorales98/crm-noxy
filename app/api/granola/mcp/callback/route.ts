import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { granolaScope } from "@/src/lib/granola-auth";
import { completeMcpAuthorization, createMcpProvider } from "@/src/lib/granola-mcp";
import { checkMcpCallback } from "@/src/lib/granola-oauth";
import { granolaAuthStore, granolaRedirectUrl } from "@/src/lib/granola-service";

const back = (req: Request, result: "connected" | "error") =>
  NextResponse.redirect(new URL(`/settings/integraciones?granola=${result}`, req.url));

/** Granola devuelve aquí al usuario con `code` y `state`. Sin un `state` que coincida no se toca nada. */
export async function GET(req: Request) {
  const access = await granolaScope({ admin: true });
  if ("error" in access) return access.error;
  const { organizationId } = access.scope;

  const params = new URL(req.url).searchParams;
  const config = await prisma.granolaConfig.findUnique({ where: { organizationId } });
  const outcome = checkMcpCallback({ storedState: config?.mcpState, state: params.get("state"), code: params.get("code"), error: params.get("error") });
  if (outcome === "invalid") return back(req, "error");

  // Cancelada o fallida: se descarta lo pendiente; una conexión que ya funcionaba sigue intacta.
  const discardPending = async () => {
    await prisma.granolaConfig.deleteMany({ where: { organizationId, status: "PENDING" } });
    await prisma.granolaConfig.updateMany({ where: { organizationId }, data: { mcpState: null, mcpVerifier: null } });
  };
  if (outcome === "denied") {
    await discardPending();
    return back(req, "error");
  }

  try {
    const provider = createMcpProvider(granolaAuthStore(organizationId), granolaRedirectUrl(req.url), () => {});
    await completeMcpAuthorization(provider, params.get("code")!);
    await prisma.granolaConfig.update({
      where: { organizationId },
      data: { mode: "MCP", apiKey: null, status: "CONNECTED", mcpState: null, mcpVerifier: null, lastSyncError: null, lastSyncAt: null, lastSyncCount: 0 },
    });
    return back(req, "connected");
  } catch {
    await discardPending();
    return back(req, "error");
  }
}
