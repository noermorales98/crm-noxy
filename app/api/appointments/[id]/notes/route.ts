import { NextResponse } from "next/server";
import { granolaScope } from "@/src/lib/granola-auth";
import { createManualNote, parseMarkdownInput } from "@/src/lib/granola-service";

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
  return NextResponse.json({ id: result.noteId }, { status: 201 });
}
