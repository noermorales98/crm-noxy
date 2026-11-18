import { NextResponse, after } from "next/server";
import { granolaScope } from "@/src/lib/granola-auth";
import { createManualNote, parseMarkdownInput } from "@/src/lib/granola-service";
import { autoGenerateSuggestions } from "@/src/lib/suggestions-service";

export const maxDuration = 60;

/** Crea una nota escrita a mano (markdown) en la cita. */
export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const access = await granolaScope();
  if ("error" in access) return access.error;
  const { id } = await context.params;
  const body = await req.json().catch(() => null);
  const markdown = parseMarkdownInput(body?.markdown);
  if (!markdown.ok) return NextResponse.json({ error: markdown.message }, { status: 400 });
  const result = await createManualNote(access.scope.organizationId, id, { title: body?.title, markdown: markdown.markdown });
  if (!result.ok) return NextResponse.json({ error: result.message }, { status: result.status });
  // Al entrar una nota nueva, la IA propone sugerencias sola (después de responder, sin hacer esperar a quien escribe).
  after(() => autoGenerateSuggestions(access.scope.organizationId, id));
  return NextResponse.json({ id: result.noteId }, { status: 201 });
}
