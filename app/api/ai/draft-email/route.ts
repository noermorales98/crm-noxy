import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";
import { completeWithAi, resolveRequestedModelId } from "@/src/lib/ai-completion";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  const orgId = (session as any).currentOrganizationId as string | undefined;
  if (!orgId) return new Response(JSON.stringify({ error: "No organization" }), { status: 400 });

  const body = await req.json() as { prompt: string; recipientEmail?: string; tone?: string; modelId?: string };
  const { prompt, recipientEmail, tone = "formal", modelId: requestedModelId } = body;
  if (!prompt?.trim()) return new Response(JSON.stringify({ error: "Missing prompt" }), { status: 400 });

  // Build context: find contact by email if provided
  let contactContext = "";
  if (recipientEmail) {
    const contact = await prisma.contact.findFirst({
      where: { email: recipientEmail, organizationId: orgId },
      select: { firstName: true, lastName: true, email: true },
    });
    if (contact) {
      contactContext = `\nDestinatario: ${contact.firstName} ${contact.lastName ?? ""} <${contact.email}>`;
    }
  }

  const toneMap: Record<string, string> = {
    formal: "profesional y formal",
    casual: "casual y amigable",
    friendly: "cálido y cercano",
  };
  const toneDesc = toneMap[tone] ?? "profesional";

  const systemPrompt = `Eres un asistente experto en redacción de correos electrónicos en español.
Genera correos concisos, claros y con el tono adecuado.
Responde SIEMPRE en este formato JSON exacto:
{"subject":"[asunto aquí]","body":"[cuerpo del correo en HTML simple aquí]"}
No incluyas nada más, solo el JSON.`;

  const userPrompt = `Tono: ${toneDesc}${contactContext}

Instrucción: ${prompt.trim()}

Genera un correo con asunto y cuerpo. El cuerpo debe ser HTML simple (párrafos con <p>, saltos con <br>).`;

  let raw = "";
  try {
    const modelId = await resolveRequestedModelId(orgId, session.user.id, requestedModelId);
    raw = await completeWithAi({
      orgId,
      modelId,
      systemPrompt,
      userPrompt,
      maxTokens: 1200,
      maxOutputChars: 4000,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error de IA";
    return new Response(JSON.stringify({ error: message }), { status: 502 });
  }

  // Parse JSON from response (model might wrap in markdown code block)
  let parsed: { subject: string; body: string };
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found");
    parsed = JSON.parse(jsonMatch[0]) as { subject: string; body: string };
    if (!parsed.subject || !parsed.body) throw new Error("Missing fields");
  } catch {
    return new Response(JSON.stringify({ error: "Failed to parse AI response", raw }), { status: 502 });
  }

  return new Response(JSON.stringify({ subject: parsed.subject, body: parsed.body }), {
    headers: { "Content-Type": "application/json" },
  });
}
