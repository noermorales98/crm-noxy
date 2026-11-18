import { NextResponse, after } from "next/server";
import { prisma } from "@/src/lib/db";
import { granolaScope } from "@/src/lib/granola-auth";
import { deleteEditableNote, parseMarkdownInput, updateEditableNote } from "@/src/lib/granola-service";
import { autoGenerateSuggestions } from "@/src/lib/suggestions-service";

export const maxDuration = 60;

/**
 * Vincula (`{ appointmentId }`) o desvincula (`{ appointmentId: null }`) una sesión a mano; esa decisión nunca la deshace
 * la sincronización. Con `{ title?, markdown? }` edita una nota manual o de Notion (las de Granola se rechazan).
 */
export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  const access = await granolaScope();
  if ("error" in access) return access.error;
  const { organizationId } = access.scope;
  const { id } = await context.params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });

  if ("title" in body || "markdown" in body) {
    let markdown: string | undefined;
    if ("markdown" in body) {
      const parsed = parseMarkdownInput(body.markdown);
      if (!parsed.ok) return NextResponse.json({ error: parsed.message }, { status: 400 });
      markdown = parsed.markdown;
    }
    const result = await updateEditableNote(organizationId, id, { title: body.title, markdown });
    if (!result.ok) return NextResponse.json({ error: result.message }, { status: result.status });
    // Si cambió el texto, la IA vuelve a leer la nota (lo ya decidido no se repite).
    if (markdown !== undefined && result.appointmentId) after(() => autoGenerateSuggestions(organizationId, result.appointmentId!));
    return NextResponse.json({ ok: true });
  }

  if (!("appointmentId" in body)) return NextResponse.json({ error: "Falta appointmentId" }, { status: 400 });
  const note = await prisma.granolaNote.findFirst({ where: { id, organizationId }, select: { id: true } });
  if (!note) return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });

  let appointmentId: string | null = null;
  if (body.appointmentId) {
    const appointment = await prisma.appointment.findFirst({ where: { id: String(body.appointmentId), organizationId }, select: { id: true } });
    if (!appointment) return NextResponse.json({ error: "Cita no encontrada" }, { status: 404 });
    appointmentId = appointment.id;
  }
  await prisma.granolaNote.update({ where: { id }, data: { appointmentId, linkSource: "MANUAL" } });
  // Una sesión que se vincula a una cita trae notas nuevas para esa cita.
  if (appointmentId) after(() => autoGenerateSuggestions(organizationId, appointmentId));
  return NextResponse.json({ ok: true, appointmentId });
}

/** Borra una nota manual o de Notion. Las de Granola no se borran aquí. */
export async function DELETE(_req: Request, context: { params: Promise<{ id: string }> }) {
  const access = await granolaScope();
  if ("error" in access) return access.error;
  const { id } = await context.params;
  const result = await deleteEditableNote(access.scope.organizationId, id);
  if (!result.ok) return NextResponse.json({ error: result.message }, { status: result.status });
  return NextResponse.json({ ok: true });
}
