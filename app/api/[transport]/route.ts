import { createMcpHandler } from "mcp-handler";
import { timingSafeEqual } from "crypto";
import { registerCrmTools } from "@/src/lib/mcp/tools";

// Servidor MCP del CRM. URL pública: https://noxthy.co/mcp (rewrite a /api/mcp).
// Auth: Authorization: Bearer <MCP_API_KEY>. Datos scopeados a MCP_ORGANIZATION_ID.

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

function isValidToken(authHeader: string | null, expected: string): boolean {
  if (!authHeader?.startsWith("Bearer ")) return false;
  const token = Buffer.from(authHeader.slice(7));
  const expectedBuf = Buffer.from(expected);
  return token.length === expectedBuf.length && timingSafeEqual(token, expectedBuf);
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
  if (!isValidToken(req.headers.get("authorization"), apiKey)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return handler(req);
}

export { withAuth as GET, withAuth as POST, withAuth as DELETE };
