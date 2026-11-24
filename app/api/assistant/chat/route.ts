import { getAiPrefs, recordKeyResult, resolveProviderEntries } from "@/src/lib/ai-keys";
import { automaticCandidates, promoteDefaultModel } from "@/src/lib/ai-completion";
import { buildModelChain, classifyStatus, shouldPromote } from "@/src/lib/ai-failover";
import { CHAT_ENDPOINTS, PROVIDER_LABEL, providerHeaders, providerModelName, providerOfModelId, type ChatProvider } from "@/src/lib/ai-provider";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";
import { buildCrmContext } from "@/src/lib/ai-context";
import { buildModulesContext, buildRelevantContext } from "@/src/lib/ai-context-modules";
import { persistBeforeClosingStream } from "@/src/lib/assistant-stream-lifecycle";
import { normalizeModelId } from "@/src/lib/ai-models";

const ACTION_CARDS_PROMPT = `
=== CAPACIDADES DE ACCIÓN ===
Puedes proponer acciones CRM usando bloques de código con lenguaje \`action\`.
El usuario verá un formulario interactivo y DEBERÁ confirmar antes de que se ejecute.

Acciones disponibles:

CONTACTOS:
- create_contact: prefill: firstName, lastName, email, phone, companyId
- edit_contact: id + prefill: firstName, lastName, email, phone, companyId
- delete_contact: id + name

DEALS/VENTAS:
- create_deal: prefill: title (requerido), value, stageId, contactId
- edit_deal: id + prefill: title, value, stageId
- delete_deal: id + title

TAREAS:
- create_task: prefill: title (requerido), dueDate, description
- complete_task: id + title

EMAIL:
- draft_email: prefill: to, subject, body

CITAS (appointments):
- update_appointment: id + title + prefill: status (confirmed|completed|cancelled|no_show|scheduled)
- delete_appointment: id + title

DISPONIBILIDAD (availability/schedules):
- create_availability: prefill: name (requerido), timezone (requerido, ej: America/Mexico_City)
- edit_availability: id + prefill: name, timezone
- delete_availability: id + name

TIPOS DE CITA (appointment-types):
- create_appointment_type: prefill: name (requerido), slug (requerido), duration en minutos (requerido), scheduleId (requerido), description, color
- edit_appointment_type: id + prefill: name, slug, duration, description, color, isActive (true|false)
- delete_appointment_type: id + name

FORMULARIOS (forms):
- create_form: prefill: name (requerido), companyId (requerido), description
- edit_form: id + prefill: name, description, isActive (true|false)
- delete_form: id + name

CONSULTAS:
- query_result: title, columns (array de strings), rows (array de arrays) — para mostrar datos en tabla

Ejemplo de formato:
\`\`\`action
{"type":"create_contact","prefill":{"firstName":"Juan","email":"juan@empresa.com"}}
\`\`\`

Reglas:
1. SIEMPRE escribe texto explicativo ANTES del bloque action
2. Usa query_result para mostrar listas de datos consultados en tablas
3. Solo propone UNA acción a la vez
4. Para delete_* y complete_task incluye el id y name/title del elemento
5. Para los IDs usa los IDs reales del contexto CRM cuando los tengas disponibles
`.trim();

function buildPageContextSection(pageContext: { page: string; id?: string; label?: string; data?: Record<string, unknown> } | null): string {
  if (!pageContext) return "";
  const lines = [`\n\n=== CONTEXTO DE PÁGINA ACTUAL ===`, `El usuario está viendo: ${pageContext.label ?? pageContext.page}`];
  if (pageContext.data && Object.keys(pageContext.data).length > 0) {
    lines.push(JSON.stringify(pageContext.data, null, 2));
  }
  return lines.join("\n");
}

const CONTEXT_TTL_MS = 60_000;
const contextCache = new Map<string, { at: number; text: string }>();

async function cachedCrmContext(userId: string, orgId: string): Promise<string> {
  const key = `${userId}:${orgId}`;
  const hit = contextCache.get(key);
  if (hit && Date.now() - hit.at < CONTEXT_TTL_MS) return hit.text;
  // Resumen del CRM clásico + módulos nuevos (clientes, contenido, videos, docs). Si los nuevos fallan, el clásico sigue.
  const [base, modules] = await Promise.all([buildCrmContext(userId, orgId), buildModulesContext(orgId).catch((err) => { console.error("[assistant/chat] contexto de módulos:", err); return ""; })]);
  const text = modules ? `${base}\n\n${modules}` : base;
  contextCache.set(key, { at: Date.now(), text });
  if (contextCache.size > 200) contextCache.delete(contextCache.keys().next().value as string);
  return text;
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
  let accountId: string | null = null;
  let customTitle = "";
  let pageContext: { page: string; id?: string; label?: string; data?: Record<string, unknown> } | null = null;
  try {
    const body = await req.json() as {
      conversationId: string;
      content: string;
      model?: string;
      preferKey?: "1" | "2";
      accountId?: string;
      title?: string;
      pageContext?: { page: string; id?: string; label?: string; data?: Record<string, unknown> };
    };
    conversationId = body.conversationId;
    content = body.content;
    model = normalizeModelId(body.model);
    preferKey = body.preferKey ?? "1";
    customTitle = typeof body.title === "string" ? body.title.trim().slice(0, 60) : "";
    accountId = typeof body.accountId === "string" && body.accountId ? body.accountId : null;
    pageContext = body.pageContext ?? null;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
  }

  const trimmed = content?.trim();
  if (!conversationId || !trimmed) {
    return new Response(JSON.stringify({ error: "Missing conversationId or content" }), { status: 400 });
  }

  const selectedModel = normalizeModelId(model);

  const conversation = await prisma.aiConversation.findFirst({
    where: { id: conversationId, userId: session.user.id!, organizationId: orgId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!conversation) {
    return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
  }

  // Guardar el mensaje y el título ya no se esperan: la respuesta no depende de ellos y la función sigue viva mientras dura el stream.
  const isFirstMessage = conversation.messages.length === 0;
  // Si la persona le puso nombre al chat antes de empezar, se respeta; si no, se toma del primer mensaje.
  const title = customTitle || trimmed.slice(0, 60) + (trimmed.length > 60 ? "…" : "");
  void Promise.all([
    prisma.aiMessage.create({ data: { conversationId, role: "user", content: trimmed } }),
    isFirstMessage ? prisma.aiConversation.update({ where: { id: conversationId }, data: { title } }) : null,
  ]).catch((err) => console.error("[assistant/chat] no se pudo guardar el mensaje del usuario:", err));

  // Contexto del CRM (12 consultas) y preferencias en paralelo; el contexto se reutiliza 60 s.
  // Además se buscan en docs, contenido y videos las palabras del mensaje, para que la IA vea justo lo que se menciona.
  const [summary, prefs, relevant] = await Promise.all([
    cachedCrmContext(session.user.id!, orgId),
    getAiPrefs(orgId),
    buildRelevantContext(orgId, trimmed).catch(() => ""),
  ]);
  const crmContext = summary + relevant;

  return streamOpenRouter(selectedModel, crmContext, conversation, trimmed, conversationId, preferKey, pageContext, orgId, prefs, accountId);
}

// ── OpenRouter ───────────────────────────────────────────────────────────────

type OrSuccess = { ok: true; body: ReadableStream<Uint8Array> };
type OrFailure = { ok: false; status: number; headers: Headers; errBody: string };
type OrResult = OrSuccess | OrFailure;

// Si el proveedor no contesta ni con las cabeceras en este tiempo, se corta y se prueba la siguiente cuenta o modelo
// (antes un modelo colgado dejaba la conversación esperando hasta el límite de la función).
const FIRST_RESPONSE_TIMEOUT_MS = 20_000;

async function callOpenRouter(apiKey: string, modelId: string, messages: unknown[], provider: ChatProvider = "openrouter", timeoutMs = FIRST_RESPONSE_TIMEOUT_MS): Promise<OrResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(CHAT_ENDPOINTS[provider], {
      method: "POST",
      headers: providerHeaders(provider, apiKey),
      body: JSON.stringify({ model: providerModelName(modelId), messages, stream: true }),
      signal: controller.signal,
    });
  } catch {
    return { ok: false, status: 408, headers: new Headers(), errBody: "El modelo tardó demasiado en responder" };
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok || !res.body) {
    const errBody = await res.text().catch(() => "");
    return { ok: false, status: res.status, headers: res.headers, errBody };
  }
  return { ok: true, body: res.body };
}

function openRouterErrorStream(failure: OrFailure, provider: ChatProvider = "openrouter"): Response {
  console.error(`[${provider}] HTTP error:`, failure.status, failure.errBody);

  let errMsg = `HTTP ${failure.status}`;
  try {
    const parsed = JSON.parse(failure.errBody);
    const detail = parsed?.error?.message ?? parsed?.message ?? "";
    if (detail) errMsg += ` — ${detail}`;
  } catch {}

  if (failure.status === 401) errMsg += " (API key inválida)";
  if (failure.status === 402) errMsg += ` (se necesitan créditos en tu cuenta de ${PROVIDER_LABEL[provider]})`;
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
  orgId: string,
  prefs: Awaited<ReturnType<typeof getAiPrefs>>,
  accountId: string | null,
) {
  const sanitizedContext = (crmContext
    .replace(/[═─┌┐└┘├┤┬┴┼│]/g, "-")
    .replace(/•/g, "-")
    .slice(0, 16000)) + buildPageContextSection(pageContext) + "\n\n" + ACTION_CARDS_PROMPT;

  const messages = [
    { role: "system", content: sanitizedContext },
    ...conversation.messages.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: trimmed },
  ];

  // Cuentas del proveedor del modelo pedido y, si ninguna sirve, otro modelo (respaldos fijados y luego automáticos).
  // Si el pedido dejó de funcionar de forma permanente, el que responde queda como predeterminado.
  // Los modelos automáticos (que consultan la lista de NVIDIA) solo se calculan si los anteriores fallan: antes se esperaban siempre.
  let chain = prefs.autoSwitch ? buildModelChain(modelId, { fallbacks: prefs.fallbackModelIds }) : [modelId];
  let extended = !prefs.autoSwitch;

  let lastFailure: { r: OrFailure; provider: ChatProvider } | null = null;
  let missing: ChatProvider | null = null;
  let primaryStatuses: number[] = [];
  for (let mi = 0; mi < chain.length || !extended; mi++) {
    if (mi >= chain.length) {
      extended = true;
      chain = buildModelChain(modelId, { fallbacks: prefs.fallbackModelIds, automatic: await automaticCandidates(orgId, modelId) });
      if (mi >= chain.length) break;
    }
    const currentModel = chain[mi];
    const provider = providerOfModelId(currentModel);
    const entries = await resolveProviderEntries(orgId, provider);
    // La preferencia de cuenta del cliente (1 = principal, 2 = secundaria) solo reordena las dos primeras de OpenRouter.
    if (provider === "openrouter" && preferKey === "2" && entries.length > 1) [entries[0], entries[1]] = [entries[1], entries[0]];
    // Cuenta elegida a mano (p. ej. al reintentar): va primero para el modelo pedido; si falla, se siguen probando las demás.
    if (mi === 0 && accountId) {
      const chosen = entries.findIndex((e) => e.id === accountId);
      if (chosen > 0) entries.unshift(...entries.splice(chosen, 1));
    }
    if (entries.length === 0) {
      missing = provider;
      continue;
    }
    const statuses: number[] = [];
    for (let ei = 0; ei < entries.length; ei++) {
      const r = await callOpenRouter(entries[ei].key, currentModel, messages, provider);
      void recordKeyResult(orgId, provider, entries[ei].id, r.ok ? 200 : r.status);
      if (r.ok) {
        const switched = mi > 0;
        if (switched && shouldPromote(primaryStatuses, currentModel, modelId)) await promoteDefaultModel(orgId, modelId, currentModel);
        // Marcadores de cuenta de OpenRouter que lee el cliente: P/S = usó la 1.ª/2.ª directamente; F/G = cayó a otra cuenta.
        const marker = provider === "openrouter" ? (ei === 0 ? (preferKey === "2" ? "S" : "P") : preferKey === "2" ? "G" : "F") : undefined;
        return buildStream(r.body, conversationId, "sse", marker, { "X-AI-Model-Used": encodeURIComponent(currentModel), "X-AI-Model-Requested": encodeURIComponent(modelId), "X-AI-Account-Used": encodeURIComponent(entries[ei].label), "X-AI-Account-Id": encodeURIComponent(entries[ei].id) });
      }
      lastFailure = { r, provider };
      statuses.push(r.status);
      if (classifyStatus(r.status) === "next-model") break;
    }
    if (mi === 0) primaryStatuses = statuses;
  }

  if (lastFailure) return openRouterErrorStream(lastFailure.r, lastFailure.provider);
  const only = missing ?? providerOfModelId(modelId);
  return errorStream(only === "nvidia"
    ? "Falta una cuenta de NVIDIA. Agrégala en Ajustes › Modelos de IA o elige otro modelo."
    : "Falta una cuenta de OpenRouter. Agrégala en Ajustes › Modelos de IA, o configura OPENROUTER_API_KEY en el servidor.");
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
  extraHeaders?: Record<string, string>,
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

        await persistBeforeClosingStream(
          async () => {
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
          },
          () => controller.close(),
        );
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache", ...(extraHeaders ?? {}) },
  });
}
