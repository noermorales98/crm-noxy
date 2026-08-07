import { createHmac, createHash, timingSafeEqual } from "crypto";

// OAuth 2.1 stateless para el servidor MCP (authorization code + PKCE + DCR).
// Los client_ids, authorization codes y tokens son payloads firmados con
// HMAC-SHA256 (AUTH_SECRET): no requieren tabla en BD y funcionan en serverless.

export const ACCESS_TOKEN_TTL = 60 * 60 * 24 * 30; // 30 días
export const REFRESH_TOKEN_TTL = 60 * 60 * 24 * 365; // 1 año
export const AUTH_CODE_TTL = 60 * 10; // 10 minutos

const now = () => Math.floor(Date.now() / 1000);

export function signPayload(payload: Record<string, unknown>): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", process.env.AUTH_SECRET!).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyPayload<T = Record<string, unknown>>(token: string): T | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expected = createHmac("sha256", process.env.AUTH_SECRET!).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}

export function verifyPkce(codeVerifier: string, codeChallenge: string): boolean {
  const computed = createHash("sha256").update(codeVerifier).digest("base64url");
  const a = Buffer.from(computed);
  const b = Buffer.from(codeChallenge);
  return a.length === b.length && timingSafeEqual(a, b);
}

// ─── Payloads concretos ───────────────────────────────────────────────────────

export interface OAuthClient {
  type: "client";
  name: string;
  redirectUris: string[];
}

export interface AuthCode {
  type: "code";
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  org: string;
  exp: number;
}

export interface AccessToken {
  type: "access";
  clientId: string;
  org: string;
  exp: number;
}

export interface RefreshToken {
  type: "refresh";
  clientId: string;
  org: string;
  exp: number;
}

export function issueTokens(clientId: string, org: string) {
  const accessToken = signPayload({ type: "access", clientId, org, exp: now() + ACCESS_TOKEN_TTL });
  const refreshToken = signPayload({ type: "refresh", clientId, org, exp: now() + REFRESH_TOKEN_TTL });
  return {
    access_token: accessToken,
    token_type: "Bearer" as const,
    expires_in: ACCESS_TOKEN_TTL,
    refresh_token: refreshToken,
    scope: "mcp",
  };
}

/** Devuelve el access token si es válido y vigente, si no null. */
export function verifyAccessToken(token: string): AccessToken | null {
  const payload = verifyPayload<AccessToken>(token);
  if (!payload || payload.type !== "access") return null;
  if (!payload.exp || payload.exp < now()) return null;
  return payload;
}
