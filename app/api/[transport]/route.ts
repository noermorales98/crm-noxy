import { createMcpHandler } from "mcp-handler";
import { timingSafeEqual } from "crypto";
import { registerCrmTools } from "@/src/lib/mcp/tools";
import { verifyAccessToken } from "@/src/lib/mcp/oauth";
import { OAUTH_CORS, corsOptions } from "@/src/lib/mcp/cors";

// Servidor MCP del CRM. URL pública: https://noxthy.co/mcp (rewrite a /api/mcp).
// Auth (dos métodos, cualquiera válido):
//   1. OAuth 2.1 (authorization code + PKCE) — el que usan Gemini/Claude/ChatGPT
//   2. API key estática: Authorization: Bearer <MCP_API_KEY>
// Datos scopeados a MCP_ORGANIZATION_ID.

const handler = createMcpHandler(
  (server) => {
    registerCrmTools(server, process.env.MCP_ORGANIZATION_ID!);
  },
  { serverInfo: { name: "noxthy-crm", version: "1.0.0" } },
  // basePath "" -> endpoint Streamable HTTP "/mcp" (la URL pública; el rewrite
  // /mcp -> /api/mcp preserva el pathname original en req.url). SSE desactivado:
  // los clientes modernos (Claude, ChatGPT, Gemini) usan Streamable HTTP.
  { maxDuration: 60, disableSse: true }
);

function isValidApiKey(token: string, expected: string): boolean {
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function isAuthorized(req: Request, apiKey: string, organizationId: string): boolean {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;
  const token = authHeader.slice(7);
  // Método 1: API key estática
  if (isValidApiKey(token, apiKey)) return true;
  // Método 2: access token OAuth emitido por /api/oauth/token
  const oauth = verifyAccessToken(token);
  return oauth !== null && oauth.org === organizationId;
}

function withAuth(req: Request) {
  const apiKey = process.env.MCP_API_KEY;
  const organizationId = process.env.MCP_ORGANIZATION_ID;
  if (!apiKey || !organizationId) {
    return new Response(JSON.stringify({ error: "MCP server not configured" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (!isAuthorized(req, apiKey, organizationId)) {
    const origin = new URL(req.url).origin;
    // WWW-Authenticate con resource_metadata (RFC 9728): así los clientes MCP
    // descubren el flujo OAuth automáticamente.
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: {
        "Content-Type": "application/json",
        ...OAUTH_CORS,
        "WWW-Authenticate": `Bearer realm="noxthy-crm", resource_metadata="${origin}/.well-known/oauth-protected-resource"`,
      },
    });
  }
  return handler(req);
}

export { withAuth as GET, withAuth as POST, withAuth as DELETE };
export const OPTIONS = corsOptions;
