import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";
import { completeWithAi } from "@/src/lib/ai-completion";
import { DEFAULT_MODEL_ID } from "@/src/lib/ai-models";

const SYSTEM_PROMPT = `Eres un estratega de contenido para redes sociales (Facebook, Instagram y TikTok) hispanohablante.
Generas ideas de contenido concretas y accionables para calendarios mensuales.
Respondes ÚNICAMENTE con un JSON válido y completo. PROHIBIDO usar bloques de código markdown, explicaciones, saludos o cualquier texto fuera del JSON.
Forma exacta:
{"ideas":[{"date":"YYYY-MM-DD","type":"video|reel|flyer|historia|entrega","title":"...","time":"11:00 am","hook":"...","script":"...","caption":"...","cta":"...","tips":"..."}]}
- "hook": frase de los primeros 3 segundos que detiene el scroll (1 línea).
- "script": guion breve de lo que se dice (3 líneas máximo).
- "caption": texto listo para publicar, con pregunta de engagement al final (3 líneas máximo).
- "tips": 2 sugerencias prácticas para grabar, separadas por punto y coma.
- Usa "entrega" para los días en que el cliente debe GRABAR y entregar material crudo; en esos, script y tips son las instrucciones de grabación.
Genera entre 3 y 4 ideas por respuesta. Sé conciso: es más importante que el JSON esté completo que tener muchas ideas.`;

// Extrae el JSON de ideas aunque la IA lo envuelva en markdown o texto extra,
// e intenta rescatarlo si la respuesta se cortó a la mitad.
function extractJson(text: string): any {
  const t = text.replace(/```(?:json)?/gi, "");
  const start = t.indexOf("{");
  if (start === -1) return null;

  const candidates: string[] = [];
  const end = t.lastIndexOf("}");
  if (end > start) candidates.push(t.slice(start, end + 1));

  // Rescate: si se cortó a la mitad, cerrar en la última idea completa
  const lastCompleteIdea = t.lastIndexOf("},");
  if (lastCompleteIdea > start) {
    candidates.push(t.slice(start, lastCompleteIdea + 1) + "]}");
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && Array.isArray(parsed.ideas)) return parsed;
    } catch {
      // probar siguiente candidato
    }
  }
  return null;
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const orgId = (session as any).currentOrganizationId as string | undefined;
  if (!orgId) return NextResponse.json({ error: "Sin organización" }, { status: 400 });

  const { id } = await params;
  const client = await prisma.contentClient.findFirst({ where: { id, organizationId: orgId } });
  if (!client) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const instruction = typeof body?.instruction === "string" ? body.instruction.trim() : "";
  const month = typeof body?.month === "string" && /^\d{4}-\d{2}$/.test(body.month) ? body.month : null;

  // Piezas ya existentes del mes para no repetir
  let existingHint = "";
  if (month) {
    const [y, m] = month.split("-").map(Number);
    const items = await prisma.contentItem.findMany({
      where: {
        clientId: id,
        date: { gte: new Date(Date.UTC(y, m - 1, 1)), lt: new Date(Date.UTC(y, m, 1)) },
      },
      select: { date: true, title: true, type: true },
    });
    if (items.length) {
      existingHint = `\nYa existen estas piezas ese mes (no repitas fechas ni temas): ${items
        .map((i) => `${i.date.toISOString().slice(0, 10)} (${i.type}) ${i.title}`)
        .join("; ")}`;
    }
  }

  // Chatbase limita el mensaje a 8000 caracteres: repartimos un presupuesto
  // entre las partes del prompt y recortamos lo que se pase.
  const PROMPT_BUDGET = 7500;
  const clip = (text: string, max: number) =>
    text.length > max ? `${text.slice(0, max)}\n[...recortado por longitud]` : text;

  const fixedPart = `Cliente/marca: ${client.name}${client.kind === "cliente" ? " (cliente)" : " (marca propia)"}
${client.description ? `Descripción: ${clip(client.description, 400)}` : ""}
${month ? `Mes a planear: ${month}. Usa solo fechas dentro de ese mes.` : ""}
${instruction ? `Instrucción del usuario: ${clip(instruction, 600)}` : "Genera ideas variadas para el calendario."}`;

  const contextBudget = Math.max(
    500,
    PROMPT_BUDGET - fixedPart.length - existingHint.length - 60
  );
  const contextPart = client.context
    ? `Contexto de marca (voz, audiencia, productos, tono):\n${clip(client.context, contextBudget)}`
    : "";

  const userPrompt = `${fixedPart}\n${contextPart}${existingHint}`;

  try {
    const schedule = await prisma.digestSchedule.findUnique({
      where: { userId_organizationId: { userId: session.user.id, organizationId: orgId } },
      select: { aiModelId: true },
    });

    const raw = await completeWithAi({
      orgId,
      modelId: schedule?.aiModelId ?? DEFAULT_MODEL_ID,
      systemPrompt: SYSTEM_PROMPT,
      userPrompt,
      maxTokens: 2500,
      maxOutputChars: 8000,
    });

    const parsed = extractJson(raw);
    if (!parsed) {
      // Guardar qué respondió realmente la IA para poder diagnosticar
      console.error("[content/ai-ideas] Respuesta no interpretable de la IA:\n", raw.slice(0, 2000));
      return NextResponse.json(
        {
          error: "La IA no devolvió ideas válidas. Intenta de nuevo.",
          detail: `La IA respondió texto sin formato de ideas. Inicio de su respuesta: "${raw.slice(0, 180)}…"`,
        },
        { status: 502 }
      );
    }

    const ideas = parsed.ideas
      .filter((i: any) => i && typeof i.date === "string" && typeof i.title === "string")
      .slice(0, 5)
      .map((i: any) => ({
        date: i.date,
        type: ["video", "reel", "flyer", "historia", "entrega", "edicion"].includes(i.type) ? i.type : "video",
        title: String(i.title).slice(0, 120),
        time: i.time || null,
        hook: i.hook || null,
        script: i.script || null,
        caption: i.caption || null,
        cta: i.cta || null,
        tips: i.tips || null,
      }));

    return NextResponse.json({ ideas });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error de IA";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
