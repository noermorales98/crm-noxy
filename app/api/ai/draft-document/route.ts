import { auth } from "@/auth";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

  const body = await req.json() as { action: string; content?: string; selection?: string; prompt?: string };
  const { action, content, selection } = body;

  if (!action) {
    return new Response(JSON.stringify({ error: "Missing action" }), { status: 400 });
  }

  if (action === "draft") {
    if (!body.prompt?.trim()) {
      return new Response(JSON.stringify({ error: "Missing prompt" }), { status: 400 });
    }
    const contextHint = content?.trim()
      ? `\n\nContexto del documento actual (para mantener coherencia de estilo y tema):\n${content.slice(0, 2000)}`
      : "";
    const draftPrompt = `${body.prompt.trim()}${contextHint}`;
    const apiKey = process.env.OPENROUTER_API_KEY ?? process.env.OPENROUTER_API_KEY_SECONDARY;
    if (!apiKey) return new Response(JSON.stringify({ error: "No API key" }), { status: 500 });
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "HTTP-Referer": "https://noxthy.co", "X-Title": "CRM Noxy" },
      body: JSON.stringify({
        model: "meta-llama/llama-3.3-70b-instruct:free",
        messages: [
          { role: "system", content: "Eres un redactor experto en español. Escribe solo el contenido pedido, sin explicaciones ni comentarios adicionales. Usa Markdown para formatear si es apropiado." },
          { role: "user", content: draftPrompt },
        ],
        stream: false,
      }),
    });
    if (!res.ok) return new Response(JSON.stringify({ error: `API error: ${res.status}` }), { status: 502 });
    const data = await res.json() as { choices?: { message?: { content?: string } }[] };
    const result = data.choices?.[0]?.message?.content ?? "";
    if (!result) return new Response(JSON.stringify({ error: "Empty response" }), { status: 502 });
    return new Response(JSON.stringify({ result }), { headers: { "Content-Type": "application/json" } });
  }

  if (!content?.trim()) {
    return new Response(JSON.stringify({ error: "Missing content" }), { status: 400 });
  }

  const actionPrompts: Record<string, string> = {
    summarize: `Resume el siguiente documento en 2-3 párrafos concisos. Mantén los puntos clave y la información más importante:\n\n${content}`,
    improve: selection
      ? `Mejora el siguiente fragmento de texto para que sea más claro, conciso y profesional. Mantén el significado original:\n\n${selection}`
      : `Mejora el siguiente documento para que sea más claro, conciso y profesional. Mantén el significado original:\n\n${content.slice(0, 4000)}`,
    continue: selection
      ? `Continúa el siguiente texto de manera coherente y natural, manteniendo el mismo tono y estilo:\n\n${selection}`
      : `Continúa el siguiente documento de manera coherente:\n\n${content.slice(-2000)}`,
  };

  const prompt = actionPrompts[action];
  if (!prompt) return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400 });

  const apiKey = process.env.OPENROUTER_API_KEY ?? process.env.OPENROUTER_API_KEY_SECONDARY;
  if (!apiKey) return new Response(JSON.stringify({ error: "No API key" }), { status: 500 });

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
        { role: "system", content: "Eres un asistente experto en redacción de documentos en español. Responde directamente sin comentarios adicionales." },
        { role: "user", content: prompt },
      ],
      stream: false,
    }),
  });

  if (!res.ok) return new Response(JSON.stringify({ error: `API error: ${res.status}` }), { status: 502 });

  const data = await res.json() as { choices?: { message?: { content?: string } }[] };
  const result = data.choices?.[0]?.message?.content ?? "";
  if (!result) return new Response(JSON.stringify({ error: "Empty response" }), { status: 502 });

  return new Response(JSON.stringify({ result }), { headers: { "Content-Type": "application/json" } });
}
