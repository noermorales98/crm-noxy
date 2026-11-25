import { createMcpHandler } from "mcp-handler";
import { timingSafeEqual } from "crypto";
import { registerCrmTools } from "@/src/lib/mcp/tools";
import { registerCrmProtocol } from "@/src/lib/mcp/protocol";
import { registerNotionTools } from "@/src/lib/mcp/notion";
import { registerContentTools } from "@/src/lib/mcp/content-tools";
import { registerSkillTools } from "@/src/lib/mcp/skill-tools";
import { verifyAccessToken, verifyPayload, type OAuthClient } from "@/src/lib/mcp/oauth";
import { OAUTH_CORS, corsOptions } from "@/src/lib/mcp/cors";
import { currentMcpAgent, currentMcpOrganization, runWithMcpContext } from "@/src/lib/mcp/client-context";
import { prisma } from "@/src/lib/db";
import { guardServer, hashAgentKey, isAgentToken, isAgentToolAllowed } from "@/src/lib/mcp/agent-keys";
import { registerOrgTools } from "@/src/lib/mcp/org-tools";
import { registerCrudTools } from "@/src/lib/mcp/crud-tools";
import { loadMcpAccess } from "@/src/lib/mcp/org-access";
import { pickMcpOrganization } from "@/src/lib/mcp/org-scope";

// Servidor MCP del CRM. URL pública: https://noxthy.co/mcp (rewrite a /api/mcp).
// Auth (dos métodos, cualquiera válido):
//   1. OAuth 2.1 (authorization code + PKCE) — el que usan Gemini/Claude/ChatGPT
//   2. API key estática: Authorization: Bearer <MCP_API_KEY>
// Datos scopeados a MCP_ORGANIZATION_ID; con ?org=<id> (una sub-cuenta del dueño de esa organización) a esa otra.

const handler = createMcpHandler(
  (rawServer) => {
    const agent = currentMcpAgent();
    if (agent) {
      // Clave de agente externo: solo su organización, solo la lista permitida (el resto no existe para ella) y cada llamada queda registrada.
      const server = guardServer(rawServer, {
        allowed: isAgentToolAllowed,
        log: async (e) => {
          await prisma.agentActivity.create({ data: { agentKeyId: agent.keyId, organizationId: agent.organizationId, tool: e.tool, ok: e.ok, error: e.error ?? null } });
        },
      });
      registerCrmTools(server, agent.organizationId);
      registerCrudTools(server, agent.organizationId);
      registerContentTools(server, agent.organizationId);
      return;
    }
    const server = rawServer;
    const baseOrganizationId = process.env.MCP_ORGANIZATION_ID!;
    // Cada conexión trabaja con UNA organización: la base, o una sub-cuenta pedida con ?org= (ya validada en withAuth).
    const organizationId = currentMcpOrganization() ?? baseOrganizationId;
    registerCrmTools(server, organizationId);
    registerCrudTools(server, organizationId);
    registerOrgTools(server, organizationId, baseOrganizationId);
    registerCrmProtocol(server, organizationId);
    registerNotionTools(server, organizationId);
    registerContentTools(server, organizationId);
    registerSkillTools(server, organizationId);
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

// Clave de agente: se compara por hash; revocada o desconocida = no entra. No necesita MCP_API_KEY.
async function agentFromRequest(req: Request) {
  const token = req.headers.get("authorization")?.startsWith("Bearer ") ? req.headers.get("authorization")!.slice(7) : "";
  if (!token || !isAgentToken(token)) return undefined;
  const key = await prisma.agentKey.findUnique({ where: { keyHash: hashAgentKey(token) }, select: { id: true, name: true, organizationId: true, revokedAt: true } });
  if (!key || key.revokedAt) return null;
  await prisma.agentKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } }).catch(() => {});
  return key;
}

function unauthorized(req: Request) {
  const origin = new URL(req.url).origin;
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json", ...OAUTH_CORS, "WWW-Authenticate": `Bearer realm="noxthy-crm", resource_metadata="${origin}/.well-known/oauth-protected-resource"` },
  });
}

async function withAuth(req: Request) {
  const agentKey = await agentFromRequest(req);
  if (agentKey === null) return unauthorized(req);
  if (agentKey) {
    if (req.method === "GET") return sseListener();
    return runWithMcpContext(
      { client: `agente:${agentKey.name}`, origin: new URL(req.url).origin, organizationId: agentKey.organizationId, agent: { keyId: agentKey.id, organizationId: agentKey.organizationId } },
      () => handler(req)
    );
  }
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
  const url = new URL(req.url);
  let scopedOrganizationId = organizationId;
  const requested = url.searchParams.get("org");
  if (requested && requested !== organizationId) {
    const access = await loadMcpAccess(organizationId);
    const choice = pickMcpOrganization(organizationId, requested, access.organizations.map((o) => o.id));
    if (!choice.ok) {
      return new Response(JSON.stringify({ error: choice.error }), { status: 403, headers: { "Content-Type": "application/json", ...OAUTH_CORS } });
    }
    scopedOrganizationId = choice.organizationId;
  }
  return runWithMcpContext({ client, origin: url.origin, organizationId: scopedOrganizationId }, () => handler(req));
}

export { withAuth as GET, withAuth as POST, withAuth as DELETE };
export const OPTIONS = corsOptions;
