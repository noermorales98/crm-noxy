import { randomBytes } from "node:crypto";
import { auth, UnauthorizedError, type OAuthClientProvider } from "@modelcontextprotocol/sdk/client/auth.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
// @ts-expect-error Node's native TypeScript runner requires an explicit extension.
import { GranolaError, isUnchanged, windowStart, type FetchResult, type GranolaSource } from "./granola-client.ts";
// @ts-expect-error Node's native TypeScript runner requires an explicit extension.
import { countMeetingTags, parseMcpMeetings, type GranolaNoteData } from "./granola-parse.ts";

export const GRANOLA_MCP_URL = "https://mcp.granola.ai/mcp";

type ClientInfo = Parameters<NonNullable<OAuthClientProvider["saveClientInformation"]>>[0];
type Tokens = Parameters<OAuthClientProvider["saveTokens"]>[0];

/** Dónde se guarda el estado OAuth de una organización. La implementación real cifra y escribe en la base. */
export interface McpAuthStore {
  loadClientInfo(): Promise<ClientInfo | undefined>;
  saveClientInfo(info: ClientInfo): Promise<void>;
  loadTokens(): Promise<Tokens | undefined>;
  saveTokens(tokens: Tokens): Promise<void>;
  loadVerifier(): Promise<string>;
  saveVerifier(verifier: string): Promise<void>;
  saveState(state: string): Promise<void>;
}

/** Proveedor OAuth del SDK de MCP, respaldado por un almacén. `onRedirect` recibe la URL de autorización de Granola. */
export function createMcpProvider(store: McpAuthStore, redirectUrl: string, onRedirect: (url: URL) => void): OAuthClientProvider {
  return {
    get redirectUrl() {
      return redirectUrl;
    },
    get clientMetadata() {
      return {
        client_name: "Noxy CRM",
        redirect_uris: [redirectUrl],
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
        token_endpoint_auth_method: "none",
      };
    },
    async state() {
      const state = randomBytes(24).toString("base64url");
      await store.saveState(state);
      return state;
    },
    clientInformation: () => store.loadClientInfo(),
    saveClientInformation: (info) => store.saveClientInfo(info),
    tokens: () => store.loadTokens(),
    saveTokens: (tokens) => store.saveTokens(tokens),
    redirectToAuthorization: (url) => onRedirect(url),
    saveCodeVerifier: (verifier) => store.saveVerifier(verifier),
    codeVerifier: () => store.loadVerifier(),
  };
}

/** Paso 1: registra el cliente (si hace falta) y deja lista la URL a la que hay que llevar al usuario. */
export async function beginMcpAuthorization(provider: OAuthClientProvider): Promise<void> {
  try {
    const result = await auth(provider, { serverUrl: GRANOLA_MCP_URL });
    if (result !== "REDIRECT") throw new GranolaError("UNAVAILABLE", "Granola no pidió autorización; intenta de nuevo.");
  } catch (error) {
    if (error instanceof GranolaError) throw error;
    throw new GranolaError("UNAVAILABLE", "No se pudo iniciar la conexión con Granola.");
  }
}

/** Paso 2: intercambia el código que Granola devolvió por tokens, que quedan guardados en el almacén. */
export async function completeMcpAuthorization(provider: OAuthClientProvider, code: string): Promise<void> {
  try {
    const result = await auth(provider, { serverUrl: GRANOLA_MCP_URL, authorizationCode: code });
    if (result !== "AUTHORIZED") throw new GranolaError("NEEDS_RECONNECT", "Granola no completó la autorización.");
  } catch (error) {
    if (error instanceof GranolaError) throw error;
    throw new GranolaError("NEEDS_RECONNECT", "No se pudo completar la conexión con Granola.");
  }
}

/**
 * Traduce un fallo al conectar o llamar: un `GranolaError` (p. ej. el que lanza el proveedor cuando el acceso caducó)
 * se respeta tal cual; `UnauthorizedError` pide reconectar; cualquier otra cosa es un fallo pasajero.
 */
export function classifyMcpError(error: unknown, fallback: string): GranolaError {
  if (error instanceof GranolaError) return error;
  if (error instanceof UnauthorizedError) return new GranolaError("NEEDS_RECONNECT", "El acceso a Granola caducó: reconecta desde Ajustes.");
  return new GranolaError("UNAVAILABLE", fallback);
}

export type McpCaller = {
  /** Llama una herramienta del servidor y devuelve su texto. */
  callTool(name: string, args: Record<string, unknown>): Promise<string>;
  close(): Promise<void>;
};

/** Abre una sesión MCP autenticada con los tokens guardados (se refrescan solos). */
export async function connectMcp(provider: OAuthClientProvider): Promise<McpCaller> {
  const client = new Client({ name: "noxy-crm", version: "1.0.0" });
  const transport = new StreamableHTTPClientTransport(new URL(GRANOLA_MCP_URL), { authProvider: provider });
  try {
    await client.connect(transport);
  } catch (error) {
    await client.close().catch(() => {});
    throw classifyMcpError(error, "No se pudo contactar con el servidor MCP de Granola.");
  }
  return {
    async callTool(name, args) {
      try {
        const result = (await client.callTool({ name, arguments: args })) as { isError?: boolean; content?: { type: string; text?: string }[] };
        const text = (result.content ?? []).filter((part) => part.type === "text").map((part) => part.text ?? "").join("\n");
        if (result.isError) throw new GranolaError("UNAVAILABLE", "Granola no pudo atender la consulta.");
        return text;
      } catch (error) {
        throw classifyMcpError(error, "No se pudo consultar a Granola.");
      }
    },
    close: () => client.close(),
  };
}

const PAGE_LIMIT = 30;
const MAX_LISTED = 200;
const DETAIL_BATCH = 10;

function paginationOf(xml: string): { hasMore: boolean; cursor: string | null } {
  const tag = /<pagination\s+([^>]*)\/?>/.exec(xml)?.[1] ?? "";
  return {
    hasMore: /has_more="true"/.test(tag),
    cursor: /next_cursor="([^"]*)"/.exec(tag)?.[1] ?? null,
  };
}

/** Fuente con el servidor MCP de Granola: lista con `search_meetings` y pide el detalle con `get_meetings`. */
export function createMcpSource(caller: Pick<McpCaller, "callTool">): GranolaSource {
  return {
    async check() {
      await caller.callTool("search_meetings", { limit: 1, attended_only: false });
    },

    async fetchNotes({ since, known, maxDetail }): Promise<FetchResult> {
      // Con corridas previas se pide por fecha de ACTUALIZACIÓN (un resumen puede cambiar días después de la reunión);
      // en la primera, por la ventana de reuniones de los últimos 30 días.
      const dateArgs: Record<string, unknown> = since ? { updated_after: since.toISOString() } : { from_date: windowStart(null).toISOString() };
      const changed: string[] = [];
      let complete = true;
      let seen = 0;
      let cursor: string | null = null;
      let previousCursor: string | null = null;
      do {
        const args: Record<string, unknown> = { ...dateArgs, limit: PAGE_LIMIT, max_participants: 0 };
        if (cursor) args.cursor = cursor;
        const xml: string = await caller.callTool("search_meetings", args);
        const listed = parseMcpMeetings(xml);
        if (listed.length < countMeetingTags(xml)) complete = false; // página cortada
        for (const meeting of listed) {
          seen++;
          if (isUnchanged(known, meeting.granolaId, meeting.updatedAt)) continue;
          if (changed.length < maxDetail) changed.push(meeting.granolaId);
          else complete = false;
        }
        const page = paginationOf(xml);
        previousCursor = cursor;
        cursor = page.hasMore && page.cursor !== previousCursor ? page.cursor : null; // un cursor repetido no avanza: se corta
        if (page.hasMore && !cursor) complete = false;
      } while (cursor && seen < MAX_LISTED);
      if (cursor) complete = false;

      const notes: GranolaNoteData[] = [];
      for (let i = 0; i < changed.length; i += DETAIL_BATCH) {
        const batch = changed.slice(i, i + DETAIL_BATCH);
        const xml = await caller.callTool("get_meetings", { meeting_ids: batch, attachments: "none" });
        const got = parseMcpMeetings(xml);
        notes.push(...got);
        // Si el servidor omitió reuniones por tamaño o la respuesta llegó cortada, no se da la ventana por cubierta.
        if (got.length < batch.length || /omitted_meetings/.test(xml)) complete = false;
      }
      return { notes, complete };
    },
  };
}
