import { OAUTH_CORS, corsOptions } from "@/src/lib/mcp/cors";

// RFC 9728 — OAuth Protected Resource Metadata.
// Los clientes MCP llegan aquí desde el header WWW-Authenticate del 401 de /mcp.
export function GET(req: Request) {
  const origin = new URL(req.url).origin;
  return Response.json(
    {
      resource: `${origin}/mcp`,
      authorization_servers: [origin],
      bearer_methods_supported: ["header"],
      scopes_supported: ["mcp"],
    },
    { headers: OAUTH_CORS }
  );
}

export const OPTIONS = corsOptions;
