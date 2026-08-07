import { OAUTH_CORS, corsOptions } from "@/src/lib/mcp/cors";
import { signPayload } from "@/src/lib/mcp/oauth";

// RFC 7591 — Dynamic Client Registration.
// Gemini/Claude/ChatGPT se registran aquí antes de iniciar el flujo OAuth.
// El client_id es un payload firmado (stateless): guarda nombre y redirect_uris.
export async function POST(req: Request) {
  let body: { redirect_uris?: unknown; client_name?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json(
      { error: "invalid_client_metadata", error_description: "JSON inválido" },
      { status: 400, headers: OAUTH_CORS }
    );
  }

  const redirectUris = body?.redirect_uris;
  if (!Array.isArray(redirectUris) || redirectUris.length === 0 || !redirectUris.every((u) => typeof u === "string")) {
    return Response.json(
      { error: "invalid_client_metadata", error_description: "redirect_uris es requerido (array de strings)" },
      { status: 400, headers: OAUTH_CORS }
    );
  }

  const clientId = signPayload({
    type: "client",
    name: typeof body.client_name === "string" ? body.client_name : "MCP Client",
    redirectUris,
  });

  return Response.json(
    {
      client_id: clientId,
      client_name: body.client_name ?? "MCP Client",
      redirect_uris: redirectUris,
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
      client_id_issued_at: Math.floor(Date.now() / 1000),
    },
    { status: 201, headers: OAUTH_CORS }
  );
}

export const OPTIONS = corsOptions;
