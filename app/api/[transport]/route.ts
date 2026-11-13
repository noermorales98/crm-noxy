import { createMcpHandler } from "mcp-handler";
import { timingSafeEqual } from "crypto";
import { registerCrmTools } from "@/src/lib/mcp/tools";
import { registerCrmProtocol } from "@/src/lib/mcp/protocol";
import { registerNotionTools } from "@/src/lib/mcp/notion";
import { registerContentTools } from "@/src/lib/mcp/content-tools";
import { verifyAccessToken, verifyPayload, type OAuthClient } from "@/src/lib/mcp/oauth";
import { OAUTH_CORS, corsOptions } from "@/src/lib/mcp/cors";
import { runWithMcpContext } from "@/src/lib/mcp/client-context";

// Servidor MCP del CRM. URL pública: https://noxthy.co/mcp (rewrite a /api/mcp).
// Auth (dos métodos, cualquiera válido):
//   1. OAuth 2.1 (authorization code + PKCE) — el que usan Gemini/Claude/ChatGPT
//   2. API key estática: Authorization: Bearer <MCP_API_KEY>
// Datos scopeados a MCP_ORGANIZATION_ID.

const handler = createMcpHandler(
  (server) => {
    const organizationId = process.env.MCP_ORGANIZATION_ID!;
    registerCrmTools(server, organizationId);
    registerCrmProtocol(server, organizationId);
    registerNotionTools(server, organizationId);
    registerContentTools(server, organizationId);
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

function clientName(req: Request, apiKey: string, organizationId: string): string | null {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  if (isValidApiKey(token, apiKey)) return "api-key";
  const oauth = verifyAccessToken(token);
  if (!oauth || oauth.org !== organizationId) return null;
  const client = verifyPayload<OAuthClient>(oauth.clientId);
  if (!client || client.type !== "client" || !client.name) return "oauth";
  return client.name;
}

// Stream SSE "dummy" para GET /mcp. El protocolo permite responder 405 en
// servidores stateless, pero el cliente de ChatGPT (openai-mcp/1.0.0) abre un
// GET periódicamente y trata el 405 como conexión rota ("pide reconectar").
// Devolvemos un stream 200 con heartbeats que se cierra antes del maxDuration.
function sseListener(): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(": connected\n\n"));
      const interval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          clearInterval(interval);
        }
      }, 15000);
      setTimeout(() => {
        clearInterval(interval);
        try {
          controller.close();
        } catch {
          // stream ya cerrado
        }
      }, 55000);
    },
  });
  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      ...OAUTH_CORS,
    },
  });
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
  const client = clientName(req, apiKey, organizationId);
  if (!client) {
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
  if (req.method === "GET") {
    return sseListener();
  }
  const origin = new URL(req.url).origin;
  return runWithMcpContext({ client, origin }, () => handler(req));
}

export { withAuth as GET, withAuth as POST, withAuth as DELETE };
export const OPTIONS = corsOptions;
