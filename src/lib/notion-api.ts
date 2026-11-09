import type { NotionEnv } from "@/src/lib/mcp/notion-credentials";

const NOTION = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";

/** Llamada a la API de Notion; lanza con el mensaje de Notion si responde con error. */
export async function notionFetch(env: Pick<NotionEnv, "token">, path: string, init?: { method?: string; body?: string }) {
  const response = await fetch(`${NOTION}${path}`, {
    method: init?.method ?? "GET",
    headers: { Authorization: `Bearer ${env.token}`, "Notion-Version": NOTION_VERSION, "Content-Type": "application/json" },
    body: init?.body,
  });
  const body = (await response.json().catch(() => ({}))) as { message?: string };
  if (!response.ok) throw new Error(body.message || `Notion respondió ${response.status}`);
  return body as Record<string, unknown>;
}
