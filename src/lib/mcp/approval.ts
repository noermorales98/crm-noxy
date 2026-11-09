import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
// @ts-expect-error Node's native TypeScript runner requires an explicit extension.
import { currentMcpClient, currentMcpOrigin } from "./client-context.ts";

// shortcut: sin almacén de sesión, la confirmación es un enlace firmado;
// elicitInput de formulario cuando exista Redis. El replay se bloquea en esta
// instancia; en otra, el token vale hasta que caduca (10 min).

const TTL_SECONDS = 60 * 10;

type TokenBody = {
  type: "preview" | "approval";
  action: string;
  summary: string;
  client: string;
  jti: string;
  exp: number;
};

export type Preview = TokenBody & { type: "preview" };

const usedUntil = new Map<string, number>();

function secretOr(secret?: string): string {
  const value = secret ?? process.env.AUTH_SECRET;
  if (!value) throw new Error("AUTH_SECRET no está configurado");
  return value;
}

function sign(body: TokenBody, secret: string): string {
  const payload = Buffer.from(JSON.stringify(body)).toString("base64url");
  const sig = createHmac("sha256", secret).update(payload).digest("base64url");
  // ~ no está en base64url: el enlace /mcp/approve/<token> queda en un solo segmento.
  return `${payload}~${sig}`;
}

function read(token: string, secret: string): TokenBody | null {
  const parts = token.split("~");
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const expected = createHmac("sha256", secret).update(payload).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const body = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as TokenBody;
    if (!body || (body.type !== "preview" && body.type !== "approval")) return null;
    if (typeof body.action !== "string" || typeof body.jti !== "string" || typeof body.exp !== "number") return null;
    return body;
  } catch {
    return null;
  }
}

export function canonicalAction(name: string, key: unknown): string {
  return `${name}:${stable(key)}`;
}

export function definedRecord(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== undefined));
}

function stable(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stable(record[key])}`)
    .join(",")}}`;
}

export function issuePreview(
  input: { action: string; summary: string; client: string },
  secret?: string,
  now = Math.floor(Date.now() / 1000),
): string {
  return sign(
    {
      type: "preview",
      action: input.action,
      summary: input.summary,
      client: input.client,
      jti: randomBytes(16).toString("base64url"),
      exp: now + TTL_SECONDS,
    },
    secretOr(secret),
  );
}

export function readPreview(token: string, secret?: string): Preview | null {
  const body = read(token, secretOr(secret));
  if (!body || body.type !== "preview") return null;
  return body as Preview;
}

export function confirmPreview(
  token: string,
  secret?: string,
  now = Math.floor(Date.now() / 1000),
): { ok: true; approvalToken: string } | { ok: false; error: string } {
  const preview = readPreview(token, secret);
  if (!preview) return { ok: false, error: "Este enlace no es válido." };
  if (preview.exp < now) return { ok: false, error: "Este enlace caducó." };
  const approvalToken = sign(
    {
      type: "approval",
      action: preview.action,
      summary: preview.summary,
      client: preview.client,
      jti: preview.jti,
      exp: preview.exp,
    },
    secretOr(secret),
  );
  return { ok: true, approvalToken };
}

export function consumeApproval(
  token: string,
  expectedAction: string,
  opts?: { secret?: string; used?: Map<string, number>; now?: number },
): { ok: true; client: string } | { ok: false; error: string } {
  const now = opts?.now ?? Math.floor(Date.now() / 1000);
  const body = read(token, secretOr(opts?.secret));
  if (!body || body.type !== "approval") return { ok: false, error: "La confirmación no es válida." };
  if (body.exp < now) return { ok: false, error: "La confirmación caducó." };
  if (body.action !== expectedAction) return { ok: false, error: "La confirmación no corresponde a esta acción." };
  const used = opts?.used ?? usedUntil;
  for (const [id, exp] of used) {
    if (exp < now) used.delete(id);
  }
  if (used.has(body.jti)) return { ok: false, error: "Esta confirmación ya se usó." };
  used.set(body.jti, body.exp);
  return { ok: true, client: body.client };
}

type ToolText = { content: { type: "text"; text: string }[]; isError?: boolean };

export function gateWrite(
  action: string,
  summary: string,
  approvalToken?: string,
): { ok: true; client: string } | { ok: false; result: ToolText } {
  if (!approvalToken) {
    const preview = issuePreview({ action, summary, client: currentMcpClient() });
    return {
      ok: false,
      result: {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                status: "needs_approval",
                summary,
                approveUrl: `${currentMcpOrigin()}/mcp/approve/${preview}`,
                next: "Una persona abre approveUrl, copia approvalToken y vuelves a llamar esta tool con ese argumento.",
              },
              null,
              2,
            ),
          },
        ],
      },
    };
  }
  const consumed = consumeApproval(approvalToken, action);
  if (!consumed.ok) {
    return {
      ok: false,
      result: { content: [{ type: "text", text: `Error: ${consumed.error}` }], isError: true },
    };
  }
  return { ok: true, client: consumed.client };
}
