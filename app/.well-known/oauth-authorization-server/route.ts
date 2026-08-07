import { OAUTH_CORS, corsOptions } from "@/src/lib/mcp/cors";

// RFC 8414 — OAuth Authorization Server Metadata.
// Describe los endpoints de autorización, token y registro dinámico (DCR).
export function GET(req: Request) {
  const origin = new URL(req.url).origin;
  return Response.json(
    {
      issuer: origin,
      authorization_endpoint: `${origin}/oauth/authorize`,
      token_endpoint: `${origin}/api/oauth/token`,
      registration_endpoint: `${origin}/api/oauth/register`,
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      code_challenge_methods_supported: ["S256"],
      token_endpoint_auth_methods_supported: ["none"],
      scopes_supported: ["mcp"],
    },
    { headers: OAUTH_CORS }
  );
}

export const OPTIONS = corsOptions;
