import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";
import { completeWithAi } from "@/src/lib/ai-completion";
import { DEFAULT_MODEL_ID } from "@/src/lib/ai-models";

const SYSTEM_PROMPT =
  "Eres un redactor de cotizaciones comerciales en español. Responde solo con el texto pedido, en texto plano, sin título, sin markdown y sin comentarios.";

type QuoteField = "notes" | "terms" | "item";

const FIELDS: QuoteField[] = ["notes", "terms", "item"];

function isQuoteField(value: unknown): value is QuoteField {
  return typeof value === "string" && (FIELDS as string[]).includes(value);
}

function fieldGuide(field: QuoteField): string {
  switch (field) {
    case "notes":
      return "Redacta las notas visibles para el cliente: alcance, mensaje y lo que incluye la propuesta. Uno o dos párrafos.";
    case "terms":
      return "Redacta términos y condiciones de la cotización: pago, vigencia, entregas y alcance. Párrafos cortos, sin viñetas markdown.";
    case "item":
      return "Redacta una sola línea con la descripción comercial del ítem. Sin precio, sin cantidad y sin viñetas.";
    default: {
      const exhaustive: never = field;
      return exhaustive;
    }
  }
}

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
    return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401 });
  }

  const orgId = (session as { currentOrganizationId?: string }).currentOrganizationId;
  if (!orgId) {
    return new Response(JSON.stringify({ error: "Sin organización" }), { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as {
    field?: unknown;
    instruction?: unknown;
    currentText?: unknown;
    clientName?: unknown;
    clientCompany?: unknown;
    currency?: unknown;
    total?: unknown;
    items?: unknown;
  } | null;

  if (!body || !isQuoteField(body.field)) {
    return new Response(JSON.stringify({ error: "Campo inválido" }), { status: 400 });
  }

  const instruction = typeof body.instruction === "string" ? body.instruction.trim() : "";
  if (!instruction) {
    return new Response(JSON.stringify({ error: "Escribe qué quieres generar" }), { status: 400 });
  }

  const currentText = typeof body.currentText === "string" ? body.currentText.trim() : "";
  const clientName = typeof body.clientName === "string" ? body.clientName.trim() : "";
  const clientCompany = typeof body.clientCompany === "string" ? body.clientCompany.trim() : "";
  const currency = typeof body.currency === "string" ? body.currency.trim() : "";
  const total = typeof body.total === "string" ? body.total.trim() : "";
  const items = Array.isArray(body.items)
    ? body.items
        .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        .slice(0, 20)
    : [];

  const contextLines = [
    clientName ? `Cliente: ${clientName}` : "",
    clientCompany ? `Empresa: ${clientCompany}` : "",
    currency ? `Moneda: ${currency}` : "",
    total ? `Total: ${total}` : "",
    items.length ? `Ítems:\n${items.map((item) => `- ${item}`).join("\n")}` : "",
    currentText ? `Texto actual:\n${currentText.slice(0, 2000)}` : "",
  ].filter(Boolean);

  const userPrompt = `${fieldGuide(body.field)}\n\nInstrucción: ${instruction}${
    contextLines.length ? `\n\nContexto de la cotización:\n${contextLines.join("\n")}` : ""
  }`;

  try {
    const modelId = await resolveModelId(session.user.id, orgId);
    const result = await completeWithAi({
      orgId,
      modelId,
      systemPrompt: SYSTEM_PROMPT,
      userPrompt,
      maxTokens: 800,
    });

    if (!result.trim()) {
      return new Response(JSON.stringify({ error: "La IA no generó contenido" }), { status: 502 });
    }

    return new Response(JSON.stringify({ result: result.trim() }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error de IA";
    return new Response(JSON.stringify({ error: message }), { status: 502 });
  }
}
