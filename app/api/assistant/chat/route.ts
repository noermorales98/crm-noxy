import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";
import { buildCrmContext } from "@/src/lib/ai-context";

const ACTION_CARDS_PROMPT = `
=== CAPACIDADES DE ACCIÓN ===
Puedes proponer acciones CRM usando bloques de código con lenguaje \`action\`.
El usuario verá un formulario interactivo y DEBERÁ confirmar antes de que se ejecute.

Acciones disponibles y sus campos:
- create_contact: prefill: firstName, lastName, email, phone, companyId
- edit_contact: requiere id + prefill (mismos campos)
- delete_contact: requiere id + name (nombre del contacto para confirmar)
- create_deal: prefill: title (requerido), value, stageId, contactId
- edit_deal: requiere id + prefill: title, value, stageId
- create_task: prefill: title (requerido), dueDate, description
- complete_task: requiere id + title (título de la tarea para confirmar)
- draft_email: prefill: to, subject, body
- query_result: columns (array), rows (array de arrays) — para mostrar datos en tabla

Ejemplo de formato:
\`\`\`action
{"type":"create_contact","prefill":{"firstName":"Juan","email":"juan@empresa.com"}}
\`\`\`

Reglas:
1. SIEMPRE escribe texto explicativo ANTES del bloque action
2. Usa query_result para mostrar listas de datos consultados en tablas
3. Solo propone una acción a la vez
4. Para delete_* incluye el id y name/title del elemento a eliminar
`.trim();

function buildPageContextSection(pageContext: { page: string; id?: string; label?: string; data?: Record<string, unknown> } | null): string {
  if (!pageContext) return "";
  const lines = [`\n\n=== CONTEXTO DE PÁGINA ACTUAL ===`, `El usuario está viendo: ${pageContext.label ?? pageContext.page}`];
  if (pageContext.data && Object.keys(pageContext.data).length > 0) {
    lines.push(JSON.stringify(pageContext.data, null, 2));
  }
  return lines.join("\n");
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }
  const orgId = (session as any).currentOrganizationId as string | undefined;
  if (!orgId) {
    return new Response(JSON.stringify({ error: "No organization context" }), { status: 400 });
  }

  let conversationId: string, content: string, model: string, preferKey: "1" | "2";
  let pageContext: { page: string; id?: string; label?: string; data?: Record<string, unknown> } | null = null;
  try {
    const body = await req.json() as {
      conversationId: string;
      content: string;
      model?: string;
      preferKey?: "1" | "2";
      pageContext?: { page: string; id?: string; label?: string; data?: Record<string, unknown> };
    };
    conversationId = body.conversationId;
    content = body.content;
    model = body.model ?? "chatbase";
    preferKey = body.preferKey ?? "1";
    pageContext = body.pageContext ?? null;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
  }

  const trimmed = content?.trim();
  if (!conversationId || !trimmed) {
    return new Response(JSON.stringify({ error: "Missing conversationId or content" }), { status: 400 });
  }

  const selectedModel = model.trim() || "chatbase";

  const conversation = await prisma.aiConversation.findFirst({
    where: { id: conversationId, userId: session.user.id!, organizationId: orgId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!conversation) {
    return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
  }

  await prisma.aiMessage.create({
    data: { conversationId, role: "user", content: trimmed },
  });

  if (conversation.messages.length === 0) {
    const title = trimmed.slice(0, 60) + (trimmed.length > 60 ? "…" : "");
    await prisma.aiConversation.update({ where: { id: conversationId }, data: { title } });
  }

  const crmContext = await buildCrmContext(session.user.id!, orgId);

  if (selectedModel === "chatbase") {
    return streamChatbase(crmContext, conversation, trimmed, conversationId, pageContext);
  } else {
    return streamOpenRouter(selectedModel, crmContext, conversation, trimmed, conversationId, preferKey, pageContext);
  }
}

// ── Chatbase ────────────────────────────────────────────────────────────────

async function streamChatbase(
  crmContext: string,
  conversation: { messages: { role: string; content: string }[] },
  trimmed: string,
  conversationId: string,
  pageContext: { page: string; id?: string; label?: string; data?: Record<string, unknown> } | null,
) {
  const contextWithExtras = `[CONTEXTO CRM ACTUALIZADO]\n\n${crmContext}${buildPageContextSection(pageContext)}\n\n${ACTION_CARDS_PROMPT}\n\n[FIN CONTEXTO]`;
  const history = [
    { role: "user", content: contextWithExtras },
    { role: "assistant", content: "Entendido. Tengo acceso a los datos del CRM y puedo proponer acciones CRM usando bloques action." },
    ...conversation.messages.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: trimmed },
  ];

  const chatbaseRes = await fetch("https://www.chatbase.co/api/v1/chat", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.CHATBASE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages: history,
      chatbotId: process.env.CHATBASE_BOT_ID,
      stream: true,
    }),
  });

  if (!chatbaseRes.ok || !chatbaseRes.body) {
    return new Response(JSON.stringify({ error: "Chatbase error" }), { status: 502 });
  }

  return buildStream(chatbaseRes.body, conversationId, "plain");
}

// ── OpenRouter ───────────────────────────────────────────────────────────────

type OrSuccess = { ok: true; body: ReadableStream<Uint8Array> };
type OrFailure = { ok: false; status: number; headers: Headers; errBody: string };
type OrResult = OrSuccess | OrFailure;

async function callOpenRouter(apiKey: string, modelId: string, messages: unknown[]): Promise<OrResult> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://noxthy.co",
      "X-Title": "CRM Noxy",
    },
    body: JSON.stringify({ model: modelId, messages, stream: true }),
  });

  if (!res.ok || !res.body) {
    const errBody = await res.text().catch(() => "");
    return { ok: false, status: res.status, headers: res.headers, errBody };
  }
  return { ok: true, body: res.body };
}

function openRouterErrorStream(failure: OrFailure): Response {
  console.error("[openrouter] HTTP error:", failure.status, failure.errBody);

  let errMsg = `HTTP ${failure.status}`;
  try {
    const parsed = JSON.parse(failure.errBody);
    const detail = parsed?.error?.message ?? parsed?.message ?? "";
    if (detail) errMsg += ` — ${detail}`;
  } catch {}

  if (failure.status === 401) errMsg += " (API key inválida)";
  if (failure.status === 402) errMsg += " (se necesitan créditos en tu cuenta de OpenRouter)";
  if (failure.status === 429) {
    const retryAfter = failure.headers.get("Retry-After");
    const resetRequests = failure.headers.get("X-RateLimit-Reset-Requests");
    const resetTokens = failure.headers.get("X-RateLimit-Reset-Tokens");
    const remainingReqs = failure.headers.get("X-RateLimit-Remaining-Requests");
    const remainingTokens = failure.headers.get("X-RateLimit-Remaining-Tokens");

    const hitTokens = remainingTokens !== null && parseInt(remainingTokens) <= 0;
    const hitRequests = remainingReqs !== null && parseInt(remainingReqs) <= 0;
    const limitType = hitTokens && !hitRequests ? "tokens" : "peticiones";

    let waitMsg = "";
    const waitSrc = retryAfter ?? resetRequests ?? resetTokens;
    if (waitSrc) {
      const secs = parseInt(waitSrc);
      if (!isNaN(secs) && secs > 0 && secs < 3600) {
        waitMsg = secs < 60 ? ` Espera ${secs} segundos.` : ` Espera ${Math.ceil(secs / 60)} minutos.`;
      }
    }
    errMsg += ` (límite de ${limitType} alcanzado.${waitMsg})`;
  }

  return errorStream(`Error ${errMsg}. Prueba con otro modelo o intenta de nuevo.`);
}

// Stream markers sent as first 2 bytes (ESC + char, never appear in LLM output):
//   \x1bP = key 1 used directly
//   \x1bS = key 2 used directly
//   \x1bF = fallback: tried key 1, key 2 succeeded  → "key 1 → key 2"
//   \x1bG = reverse fallback: tried key 2, key 1 succeeded → "key 2 → key 1"

async function streamOpenRouter(
  modelId: string,
  crmContext: string,
  conversation: { messages: { role: string; content: string }[] },
  trimmed: string,
  conversationId: string,
  preferKey: "1" | "2",
  pageContext: { page: string; id?: string; label?: string; data?: Record<string, unknown> } | null,
) {
  const primaryKey = process.env.OPENROUTER_API_KEY;
  const secondaryKey = process.env.OPENROUTER_API_KEY_SECONDARY;

  if (!primaryKey && !secondaryKey) {
    return errorStream("Falta OPENROUTER_API_KEY en el servidor. Agrégala al .env.local y reinicia.");
  }

  const sanitizedContext = (crmContext
    .replace(/[═─┌┐└┘├┤┬┴┼│]/g, "-")
    .replace(/•/g, "-")
    .slice(0, 6000)) + buildPageContextSection(pageContext) + "\n\n" + ACTION_CARDS_PROMPT;

  const messages = [
    { role: "system", content: sanitizedContext },
    ...conversation.messages.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: trimmed },
  ];

  if (preferKey === "2" && secondaryKey) {
    // User prefers key 2 — try secondary first
    const r = await callOpenRouter(secondaryKey, modelId, messages);
    if (r.ok) return buildStream(r.body, conversationId, "sse", "S");

    if (primaryKey) {
      console.warn(`[openrouter] Secondary key failed (${r.status}), falling back to primary key…`);
      const r2 = await callOpenRouter(primaryKey, modelId, messages);
      if (r2.ok) return buildStream(r2.body, conversationId, "sse", "G");
      return openRouterErrorStream(r2);
    }
    return openRouterErrorStream(r);
  }

  // Default (preferKey "1" or no secondary): try primary first
  if (primaryKey) {
    const r = await callOpenRouter(primaryKey, modelId, messages);
    if (r.ok) return buildStream(r.body, conversationId, "sse", "P");

    if (secondaryKey) {
      console.warn(`[openrouter] Primary key failed (${r.status}), falling back to secondary key…`);
      const r2 = await callOpenRouter(secondaryKey, modelId, messages);
      if (r2.ok) return buildStream(r2.body, conversationId, "sse", "F");
      return openRouterErrorStream(r2);
    }
    return openRouterErrorStream(r);
  }

  // Only secondary configured
  const r = await callOpenRouter(secondaryKey!, modelId, messages);
  if (r.ok) return buildStream(r.body, conversationId, "sse", "S");
  return openRouterErrorStream(r);
}

function errorStream(message: string): Response {
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(`⚠️ ${message}`));
      controller.close();
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" },
  });
}

// ── Shared stream builder ────────────────────────────────────────────────────

function buildStream(
  body: ReadableStream<Uint8Array>,
  conversationId: string,
  format: "plain" | "sse",
  keyLabel?: string,
) {
  let fullResponse = "";
  let hasContent = false;
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const stream = new ReadableStream({
    async start(controller) {
      const reader = body.getReader();
      let buffer = "";

      // Prepend 2-byte key marker (ESC + single char). Never appears in LLM output.
      // Not counted in fullResponse so it isn't persisted to the database.
      if (keyLabel) {
        controller.enqueue(encoder.encode(`\x1b${keyLabel}`));
      }

      const enqueue = (text: string) => {
        if (!text) return;
        fullResponse += text;
        hasContent = true;
        controller.enqueue(encoder.encode(text));
      };

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const raw = decoder.decode(value, { stream: true });

          if (format === "plain") {
            enqueue(raw);
          } else {
            // OpenRouter SSE: lines starting with "data: "
            buffer += raw;
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
              const trimmedLine = line.trim();
              if (!trimmedLine.startsWith("data: ")) continue;
              const data = trimmedLine.slice(6).trim();
              if (data === "[DONE]") continue;

              let json: any;
              try {
                json = JSON.parse(data);
              } catch {
                continue; // skip malformed lines
              }

              // OpenRouter may embed errors inside the SSE stream
              if (json.error) {
                const errMsg: string = json.error?.message ?? "Error desconocido del modelo";
                console.error("[openrouter] stream-level error:", json.error);
                enqueue(`⚠️ Error: ${errMsg}. Prueba con otro modelo.`);
                return; // stop reading; finally will close + save
              }

              const token: string = json.choices?.[0]?.delta?.content ?? "";
              enqueue(token);
            }
          }
        }
      } catch (err) {
        console.error("[assistant/chat] stream read error:", err);
      } finally {
        // If the model produced nothing, show a helpful message instead of silence
        if (!hasContent) {
          const fallback =
            "Este modelo no generó respuesta. Puede estar sobrecargado o temporalmente no disponible. Intenta de nuevo o selecciona otro modelo.";
          controller.enqueue(encoder.encode(fallback));
          fullResponse = fallback;
        }

        controller.close();

        try {
          if (fullResponse.trim()) {
            await prisma.aiMessage.create({
              data: { conversationId, role: "assistant", content: fullResponse.trim() },
            });
            await prisma.aiConversation.update({
              where: { id: conversationId },
              data: { updatedAt: new Date() },
            });
          }
        } catch (dbErr) {
          console.error("[assistant/chat] Failed to save assistant message:", dbErr);
        }
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" },
  });
}
