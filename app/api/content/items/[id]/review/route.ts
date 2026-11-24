import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";
import { completeWithAi } from "@/src/lib/ai-completion";
import { getAiPrefs } from "@/src/lib/ai-keys";
import { DEFAULT_MODEL_ID } from "@/src/lib/ai-models";
import { buildReviewPrompt, formatReviewNote, parseReview } from "@/src/lib/content-review";

// Revisa una pieza con la IA (tono de la marca, ortografía, CTA). Devuelve el texto de la nota; la pantalla la guarda como nota del equipo.

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const orgId = session?.currentOrganizationId;
  if (!session?.user?.id || !orgId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;

  const item = await prisma.contentItem.findFirst({
    where: { id, organizationId: orgId },
    select: { title: true, type: true, hook: true, script: true, caption: true, cta: true, client: { select: { name: true, context: true } } },
  });
  if (!item) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  if (![item.hook, item.script, item.caption, item.cta].some((v) => v?.trim())) {
    return NextResponse.json({ error: "La pieza no tiene gancho, guion, caption ni CTA que revisar." }, { status: 400 });
  }

  try {
    const prompt = buildReviewPrompt({ ...item, brandName: item.client.name, brandVoice: item.client.context });
    const prefs = await getAiPrefs(orgId);
    const text = await completeWithAi({ orgId, modelId: prefs.defaultModelId ?? DEFAULT_MODEL_ID, systemPrompt: prompt.system, userPrompt: prompt.user, maxTokens: 700, maxOutputChars: 2500 });
    const { verdict, body } = parseReview(text);
    return NextResponse.json({ verdict, note: formatReviewNote(verdict, body) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo revisar con la IA." }, { status: 502 });
  }
}
