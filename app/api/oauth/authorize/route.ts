import { auth } from "@/auth";
import { signPayload, verifyPayload, AUTH_CODE_TTL, type OAuthClient } from "@/src/lib/mcp/oauth";

// POST del formulario de consentimiento (/oauth/authorize).
// Requiere sesión del CRM; emite el authorization code y redirige al cliente.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "login_required" }, { status: 401 });
  }

  const organizationId = process.env.MCP_ORGANIZATION_ID;
  if (!organizationId) {
    return Response.json({ error: "server_error", error_description: "MCP no configurado" }, { status: 503 });
  }

  const form = await req.formData();
  const clientId = String(form.get("client_id") ?? "");
  const redirectUri = String(form.get("redirect_uri") ?? "");
  const state = String(form.get("state") ?? "");
  const codeChallenge = String(form.get("code_challenge") ?? "");

  const client = verifyPayload<OAuthClient>(clientId);
  if (!client || client.type !== "client" || !client.redirectUris.includes(redirectUri) || !codeChallenge) {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }

  const code = signPayload({
    type: "code",
    clientId,
    redirectUri,
    codeChallenge,
    org: organizationId,
    exp: Math.floor(Date.now() / 1000) + AUTH_CODE_TTL,
  });

  const url = new URL(redirectUri);
  url.searchParams.set("code", code);
  if (state) url.searchParams.set("state", state);

  return new Response(null, { status: 302, headers: { Location: url.toString() } });
}
