import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";
import { completeWithAi, resolveRequestedModelId } from "@/src/lib/ai-completion";
import { createVideosFromRows } from "@/src/lib/video-import";
import { PDF_SYSTEM_PROMPT, buildPdfExtractionPrompt, extractJsonObject, normalizeVideoRows } from "@/src/lib/pdf-videos";
import pdfParse from "pdf-parse";

const MAX_PDF_BYTES = 6 * 1024 * 1024;

/**
 * Dos pasos:
 * 1. { pdfBase64, defaultPlatform? } → extrae el texto con pdf-parse y la IA lo convierte en filas;
 *    devuelve { total, rows } para que la UI los muestre antes de guardar.
 * 2. { rows, preview: false } → crea los videos con la misma deduplicación que el CSV.
 */
export async function POST(req: Request) {
  const session = await auth();
  const organizationId = (session as any)?.currentOrganizationId;
  if (!session?.user || !organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });

  const rows = Array.isArray(body.rows) ? body.rows : null;
  if (rows) {
    if (rows.length > 200) return NextResponse.json({ error: "Máximo 200 filas" }, { status: 400 });
    const result = await createVideosFromRows(organizationId, rows);
    return NextResponse.json(result);
  }

  const pdfBase64 = typeof body.pdfBase64 === "string" ? body.pdfBase64 : "";
  const defaultPlatform = typeof body.defaultPlatform === "string" ? body.defaultPlatform.trim().slice(0, 60) : "";
  if (!pdfBase64) return NextResponse.json({ error: "Falta el PDF (pdfBase64) o las filas (rows)" }, { status: 400 });

  let buffer: Buffer;
  try {
    buffer = Buffer.from(pdfBase64, "base64");
  } catch {
    return NextResponse.json({ error: "PDF inválido (base64)" }, { status: 400 });
  }
  if (!buffer.length || buffer.length > MAX_PDF_BYTES) return NextResponse.json({ error: "PDF vacío o mayor a 6 MB" }, { status: 400 });

  let text: string;
  try {
    const parsed = await pdfParse(buffer);
    text = typeof parsed?.text === "string" ? parsed.text : "";
  } catch {
    return NextResponse.json({ error: "No se pudo leer el PDF. Asegúrate de que sea un PDF de Metricool con texto." }, { status: 400 });
  }
  if (text.trim().length < 40) {
    return NextResponse.json({ error: "El PDF no tiene texto extraíble (puede ser una imagen). Exporta el reporte como CSV o texto desde Metricool." }, { status: 422 });
  }

  const modelId = await resolveRequestedModelId(organizationId, session.user.id, typeof body.modelId === "string" ? body.modelId : null);
  let raw: string;
  try {
    raw = await completeWithAi({
      orgId: organizationId,
      modelId,
      systemPrompt: PDF_SYSTEM_PROMPT,
      userPrompt: buildPdfExtractionPrompt(text),
      maxTokens: 2500,
      maxOutputChars: 9000,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error de IA" }, { status: 502 });
  }

  const parsedJson = extractJsonObject(raw);
  if (!parsedJson) {
    console.error("[videos/import-pdf] Respuesta no interpretable:\n", raw.slice(0, 2000));
    return NextResponse.json({ error: "La IA no devolvió datos en el formato esperado. Intenta de nuevo o importa el CSV." }, { status: 502 });
  }

  const normalized = normalizeVideoRows(parsedJson, defaultPlatform || undefined);
  return NextResponse.json({ total: normalized.length, rows: normalized });
}
