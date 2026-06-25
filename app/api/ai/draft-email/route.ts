import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  const orgId = (session as any).currentOrganizationId as string | undefined;
  if (!orgId) return new Response(JSON.stringify({ error: "No organization" }), { status: 400 });

  const body = await req.json() as { prompt: string; recipientEmail?: string; tone?: string };
  const { prompt, recipientEmail, tone = "formal" } = body;
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

  const apiKey = process.env.OPENROUTER_API_KEY ?? process.env.OPENROUTER_API_KEY_SECONDARY;
  if (!apiKey) return new Response(JSON.stringify({ error: "No API key configured" }), { status: 500 });

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://noxthy.co",
      "X-Title": "CRM Noxy",
    },
    body: JSON.stringify({
      model: "meta-llama/llama-3.3-70b-instruct:free",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      stream: false,
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    return new Response(JSON.stringify({ error: `OpenRouter error: ${res.status} ${err}` }), { status: 502 });
  }

  const data = await res.json() as { choices?: { message?: { content?: string } }[] };
  const raw = data.choices?.[0]?.message?.content ?? "";

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
