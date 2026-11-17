import { NextResponse } from "next/server";
import { granolaScope } from "@/src/lib/granola-auth";
import { importNotionNote } from "@/src/lib/granola-service";

export const maxDuration = 60;

/** Importa una página de Notion (`{ url }`: enlace o id) como nota de la cita. Reimportar actualiza la misma nota. */
export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const access = await granolaScope();
  if ("error" in access) return access.error;
  // Usa el token de Notion de toda la organización: solo quien administra puede elegir qué páginas se leen con él.
  if (!access.scope.canManage) return NextResponse.json({ error: "Solo el dueño o un administrador puede importar páginas de Notion." }, { status: 403 });
  const { id } = await context.params;
  const body = await req.json().catch(() => null);
  const result = await importNotionNote(access.scope.organizationId, id, body?.url);
  if (!result.ok) return NextResponse.json({ error: result.message }, { status: result.status });
  return NextResponse.json({ id: result.noteId }, { status: 201 });
}
