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
Genera EXACTAMENTE el número de ideas que se te pida, cada una en una fecha distinta dentro del rango indicado. Sé conciso: es más importante que el JSON esté completo que tener textos largos.`;

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

const VALID_TYPES = ["video", "reel", "flyer", "historia", "entrega", "edicion"];

function normalizeIdeas(parsed: any, dateFrom?: string, dateTo?: string) {
  return parsed.ideas
    .filter((i: any) => i && typeof i.date === "string" && typeof i.title === "string")
    .map((i: any) => ({
      date: i.date,
      type: VALID_TYPES.includes(i.type) ? i.type : "video",
      title: String(i.title).slice(0, 120),
      time: i.time || null,
      hook: i.hook || null,
      script: i.script || null,
      caption: i.caption || null,
      cta: i.cta || null,
      tips: i.tips || null,
    }))
    .filter((i: any) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(i.date)) return false;
      if (dateFrom && i.date < dateFrom) return false;
      if (dateTo && i.date > dateTo) return false;
      return true;
    });
}

const PROMPT_BUDGET = 7500;
const clip = (text: string, max: number) =>
  text.length > max ? `${text.slice(0, max)}\n[...recortado por longitud]` : text;

type GenOptions = {
  orgId: string;
  modelId: string;
  client: { name: string; kind: string; description: string | null; context: string | null };
  instruction: string;
  count: number;
  dateFrom: string;
  dateTo: string;
  avoidHint: string; // piezas existentes + ya generadas en otras semanas
};

async function generateBatch(opts: GenOptions) {
  const fixedPart = `Cliente/marca: ${opts.client.name}${opts.client.kind === "cliente" ? " (cliente)" : " (marca propia)"}
${opts.client.description ? `Descripción: ${clip(opts.client.description, 400)}` : ""}
Genera EXACTAMENTE ${opts.count} idea(s) de contenido, cada una en una fecha distinta entre ${opts.dateFrom} y ${opts.dateTo} (inclusive).
${opts.instruction ? `Instrucción del usuario: ${clip(opts.instruction, 600)}` : "Ideas variadas para el calendario."}`;

  const contextBudget = Math.max(500, PROMPT_BUDGET - fixedPart.length - opts.avoidHint.length - 60);
  const contextPart = opts.client.context
    ? `Contexto de marca (voz, audiencia, productos, tono):\n${clip(opts.client.context, contextBudget)}`
    : "";

  const userPrompt = `${fixedPart}\n${contextPart}${opts.avoidHint}`;

  const raw = await completeWithAi({
    orgId: opts.orgId,
    modelId: opts.modelId,
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    maxTokens: 2500,
    maxOutputChars: 8000,
  });

  const parsed = extractJson(raw);
  if (!parsed) {
    console.error("[content/ai-ideas] Respuesta no interpretable:\n", raw.slice(0, 2000));
    throw new Error(`La IA respondió texto sin formato de ideas. Inicio: "${raw.slice(0, 120)}…"`);
  }
  return normalizeIdeas(parsed, opts.dateFrom, opts.dateTo);
}

// Semana w (1-based) del mes: días (w-1)*7+1 .. min(w*7, díasDelMes)
function weekRange(year: number, month1: number, week: number): { from: string; to: string } | null {
  const daysInMonth = new Date(Date.UTC(year, month1, 0)).getUTCDate();
  const startDay = (week - 1) * 7 + 1;
  if (startDay > daysInMonth) return null;
  const endDay = Math.min(week * 7, daysInMonth);
  const mm = String(month1).padStart(2, "0");
  return {
    from: `${year}-${mm}-${String(startDay).padStart(2, "0")}`,
    to: `${year}-${mm}-${String(endDay).padStart(2, "0")}`,
  };
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
  const perWeek = Math.min(5, Math.max(1, typeof body?.perWeek === "number" ? Math.round(body.perWeek) : 2));
  const weeksRaw = Array.isArray(body?.weeks) ? body.weeks : null;
  const weeks = weeksRaw
    ? [...new Set(weeksRaw.filter((w: any) => Number.isInteger(w) && w >= 1 && w <= 5))].sort() as number[]
    : null;

  // Piezas ya existentes del mes para no repetir
  let existingTitles: string[] = [];
  if (month) {
    const [y, m] = month.split("-").map(Number);
    const items = await prisma.contentItem.findMany({
      where: {
        clientId: id,
        date: { gte: new Date(Date.UTC(y, m - 1, 1)), lt: new Date(Date.UTC(y, m, 1)) },
      },
      select: { date: true, title: true, type: true },
    });
    existingTitles = items.map((i) => `${i.date.toISOString().slice(0, 10)} (${i.type}) ${i.title}`);
  }

  const schedule = await prisma.digestSchedule.findUnique({
    where: { userId_organizationId: { userId: session.user.id, organizationId: orgId } },
    select: { aiModelId: true },
  });
  const modelId = schedule?.aiModelId ?? DEFAULT_MODEL_ID;

  try {
    // ── Modo calendario completo: una llamada por semana ──────────────────────
    if (month && weeks && weeks.length > 0) {
      const [y, m] = month.split("-").map(Number);
      const allIdeas: any[] = [];
      const failedWeeks: { week: number; error: string }[] = [];
      const generatedTitles: string[] = [];

      for (const week of weeks) {
        const range = weekRange(y, m, week);
        if (!range) continue; // ej. semana 5 en mes de 28 días con 4 semanas llenas

        const avoid = [...existingTitles, ...generatedTitles];
        const avoidHint = avoid.length
          ? `\nNo repitas estas fechas ni temas (ya están en el calendario): ${avoid.join("; ")}`
          : "";

        try {
          const ideas = await generateBatch({
            orgId,
            modelId,
            client,
            instruction: instruction
              ? `${instruction} (lote: semana ${week} del mes)`
              : `Lote: semana ${week} del mes. No repitas temas de otras semanas.`,
            count: perWeek,
            dateFrom: range.from,
            dateTo: range.to,
            avoidHint,
          });
          for (const idea of ideas) {
            allIdeas.push({ ...idea, week });
            generatedTitles.push(`${idea.date} ${idea.title}`);
          }
        } catch (e: any) {
          console.error(`[content/ai-ideas] semana ${week} falló:`, e?.message);
          failedWeeks.push({ week, error: e?.message ?? "Error de IA" });
        }
      }

      if (allIdeas.length === 0 && failedWeeks.length > 0) {
        return NextResponse.json(
          { error: "La IA no devolvió ideas válidas. Intenta de nuevo.", detail: failedWeeks[0].error },
          { status: 502 }
        );
      }

      return NextResponse.json({ ideas: allIdeas, failedWeeks });
    }

    // ── Modo tanda única (compatibilidad) ─────────────────────────────────────
    let dateFrom = "2026-01-01";
    let dateTo = "2026-12-31";
    if (month) {
      const [y, m] = month.split("-").map(Number);
      const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
      dateFrom = `${month}-01`;
      dateTo = `${month}-${String(daysInMonth).padStart(2, "0")}`;
    }

    const avoidHint = existingTitles.length
      ? `\nNo repitas estas fechas ni temas (ya están en el calendario): ${existingTitles.join("; ")}`
      : "";

    const ideas = await generateBatch({
      orgId,
      modelId,
      client,
      instruction,
      count: perWeek,
      dateFrom,
      dateTo,
      avoidHint,
    });

    return NextResponse.json({ ideas });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error de IA";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
