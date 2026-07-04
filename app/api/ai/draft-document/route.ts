import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";
import { completeWithAi } from "@/src/lib/ai-completion";
import { DEFAULT_MODEL_ID } from "@/src/lib/ai-models";

const SYSTEM_PROMPT =
  "Eres un asistente experto en redacción de documentos en español. Responde directamente con el contenido pedido, sin explicaciones ni comentarios adicionales. Usa Markdown cuando sea apropiado.";

async function resolveModelId(userId: string, orgId: string) {
  const schedule = await prisma.digestSchedule.findUnique({
    where: { userId_organizationId: { userId, organizationId: orgId } },
    select: { aiModelId: true },
  });
  return schedule?.aiModelId ?? DEFAULT_MODEL_ID;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const orgId = (session as { currentOrganizationId?: string }).currentOrganizationId;
  if (!orgId) {
    return new Response(JSON.stringify({ error: "Sin organización" }), { status: 400 });
  }

  const body = (await req.json()) as {
    action: string;
    content?: string;
    selection?: string;
    prompt?: string;
  };
  const { action, content, selection } = body;

  if (!action) {
    return new Response(JSON.stringify({ error: "Missing action" }), { status: 400 });
  }

  let userPrompt = "";

  if (action === "draft") {
    if (!body.prompt?.trim()) {
      return new Response(JSON.stringify({ error: "Missing prompt" }), { status: 400 });
    }
    const contextHint = content?.trim()
      ? `\n\nContexto del documento actual (mantén coherencia de estilo y tema):\n${content.slice(0, 2000)}`
      : "";
    userPrompt = `${body.prompt.trim()}${contextHint}`;
  } else {
    if (!content?.trim()) {
      return new Response(JSON.stringify({ error: "Missing content" }), { status: 400 });
    }

    const actionPrompts: Record<string, string> = {
      summarize: `Resume el siguiente documento en 2-3 párrafos concisos. Mantén los puntos clave:\n\n${content}`,
      improve: selection?.trim()
        ? `Mejora el siguiente fragmento para que sea más claro, conciso y profesional. Mantén el significado:\n\n${selection}`
        : `Mejora el siguiente documento para que sea más claro y profesional:\n\n${content.slice(0, 4000)}`,
      continue: selection?.trim()
        ? `Continúa el siguiente texto de forma coherente, manteniendo tono y estilo:\n\n${selection}`
        : `Continúa el siguiente documento de forma coherente:\n\n${content.slice(-2000)}`,
    };

    userPrompt = actionPrompts[action] ?? "";
    if (!userPrompt) {
      return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400 });
    }
  }

  try {
    const modelId = await resolveModelId(session.user.id, orgId);
    const result = await completeWithAi({
      orgId,
      modelId,
      systemPrompt: SYSTEM_PROMPT,
      userPrompt,
      maxTokens: 1200,
    });

    if (!result.trim()) {
      return new Response(JSON.stringify({ error: "La IA no generó contenido" }), { status: 502 });
    }

    return new Response(JSON.stringify({ result }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error de IA";
    return new Response(JSON.stringify({ error: message }), { status: 502 });
  }
}
