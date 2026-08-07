import { OAUTH_CORS, corsOptions } from "@/src/lib/mcp/cors";
import {
  verifyPayload,
  verifyPkce,
  issueTokens,
  type AuthCode,
  type RefreshToken,
} from "@/src/lib/mcp/oauth";

// OAuth 2.1 token endpoint (application/x-www-form-urlencoded).
// Grants: authorization_code (con PKCE S256) y refresh_token.
export async function POST(req: Request) {
  let params: URLSearchParams;
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = await req.json().catch(() => ({}));
    params = new URLSearchParams(Object.entries(body).map(([k, v]) => [k, String(v)]));
  } else {
    params = new URLSearchParams(await req.text());
  }

  const grantType = params.get("grant_type");
  const now = Math.floor(Date.now() / 1000);

  if (grantType === "authorization_code") {
    const code = params.get("code") ?? "";
    const redirectUri = params.get("redirect_uri") ?? "";
    const codeVerifier = params.get("code_verifier") ?? "";
    const clientId = params.get("client_id") ?? "";

    const payload = verifyPayload<AuthCode>(code);
    const invalid = () =>
      Response.json({ error: "invalid_grant" }, { status: 400, headers: OAUTH_CORS });

    if (!payload || payload.type !== "code") return invalid();
    if (!payload.exp || payload.exp < now) return invalid();
    if (payload.clientId !== clientId || payload.redirectUri !== redirectUri) return invalid();
    if (!codeVerifier || !verifyPkce(codeVerifier, payload.codeChallenge)) return invalid();

    return Response.json(issueTokens(clientId, payload.org), { headers: OAUTH_CORS });
  }

  if (grantType === "refresh_token") {
    const refreshToken = params.get("refresh_token") ?? "";
    const payload = verifyPayload<RefreshToken>(refreshToken);
    if (!payload || payload.type !== "refresh" || !payload.exp || payload.exp < now) {
      return Response.json({ error: "invalid_grant" }, { status: 400, headers: OAUTH_CORS });
    }
    return Response.json(issueTokens(payload.clientId, payload.org), { headers: OAUTH_CORS });
  }

  return Response.json(
    { error: "unsupported_grant_type" },
    { status: 400, headers: OAUTH_CORS }
  );
}

export const OPTIONS = corsOptions;
