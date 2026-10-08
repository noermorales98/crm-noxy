import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";
import { parseReminderDaysBefore } from "@/src/lib/content-reminder-options";
import { parsePublishStatus, uploadedAtForStatus } from "@/src/lib/content-publish";
import { pushContentItem, removeContentItemEvent } from "@/src/lib/content-google-sync";

const ALLOWED_TYPES = ["video", "reel", "flyer", "historia", "entrega", "edicion"];

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const orgId = (session as any).currentOrganizationId as string | undefined;
  if (!orgId) return NextResponse.json({ error: "Sin organización" }, { status: 400 });

  const { id } = await params;
  const existing = await prisma.contentItem.findFirst({ where: { id, organizationId: orgId } });
  if (!existing) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (typeof body.title === "string" && body.title.trim()) data.title = body.title.trim();
  if (typeof body.type === "string" && ALLOWED_TYPES.includes(body.type)) data.type = body.type;
  if (typeof body.date === "string" && body.date) {
    const d = new Date(body.date.length === 10 ? `${body.date}T12:00:00Z` : body.date);
    if (!isNaN(d.getTime())) data.date = d;
  }
  for (const key of ["time", "hook", "script", "caption", "cta", "tips", "note"] as const) {
    if (typeof body[key] === "string" || body[key] === null) data[key] = body[key] || null;
  }
  const incomingNote = typeof body.editorNote === "string" ? body.editorNote.trim() : "";
  const updateNoteId = typeof body.updateEditorNoteId === "string" ? body.updateEditorNoteId : "";
  const deleteNoteId = typeof body.deleteEditorNoteId === "string" ? body.deleteEditorNoteId : "";
  if (deleteNoteId) {
    if (deleteNoteId.startsWith("legacy-")) {
      data.editorNote = null;
    } else {
      const owned = await prisma.contentItemEditorNote.findFirst({ where: { id: deleteNoteId, itemId: id } });
      if (!owned) return NextResponse.json({ error: "Nota no encontrada" }, { status: 404 });
      await prisma.contentItemEditorNote.delete({ where: { id: deleteNoteId } });
      const latest = await prisma.contentItemEditorNote.findFirst({
        where: { itemId: id },
        orderBy: { createdAt: "desc" },
      });
      data.editorNote = latest?.body ?? null;
    }
  } else if (updateNoteId) {
    if (!incomingNote) return NextResponse.json({ error: "La nota no puede estar vacía" }, { status: 400 });
    if (updateNoteId.startsWith("legacy-")) {
      data.editorNote = incomingNote;
    } else {
      const owned = await prisma.contentItemEditorNote.findFirst({ where: { id: updateNoteId, itemId: id } });
      if (!owned) return NextResponse.json({ error: "Nota no encontrada" }, { status: 404 });
      await prisma.contentItemEditorNote.update({ where: { id: updateNoteId }, data: { body: incomingNote } });
      const latest = await prisma.contentItemEditorNote.findFirst({
        where: { itemId: id },
        orderBy: { createdAt: "desc" },
      });
      data.editorNote = latest?.body ?? incomingNote;
    }
  } else if (incomingNote) {
    const existingCount = await prisma.contentItemEditorNote.count({ where: { itemId: id } });
    if (existingCount === 0 && existing.editorNote?.trim() && existing.editorNote.trim() !== incomingNote) {
      await prisma.contentItemEditorNote.create({
        data: { itemId: id, body: existing.editorNote.trim(), createdAt: existing.updatedAt },
      });
    }
    await prisma.contentItemEditorNote.create({ data: { itemId: id, body: incomingNote } });
    data.editorNote = incomingNote;
  }
  if (body.publishStatus !== undefined) {
    const status = parsePublishStatus(body.publishStatus);
    data.publishStatus = status;
    data.uploadedAt = uploadedAtForStatus(status, existing.publishStatus, existing.uploadedAt);
  }
  if (Array.isArray(body.hooksAlt)) {
    data.hooksAlt = JSON.stringify(body.hooksAlt.filter((h: any) => typeof h === "string" && h.trim()));
  }
  if (typeof body.reminderEnabled === "boolean") data.reminderEnabled = body.reminderEnabled;
  if (body.reminderDaysBefore !== undefined) {
    data.reminderDaysBefore = parseReminderDaysBefore(body.reminderDaysBefore, existing.reminderDaysBefore);
  }

  const item = await prisma.contentItem.update({
    where: { id },
    data,
    include: { editorNotes: { orderBy: { createdAt: "desc" } } },
  });
  await pushContentItem(orgId, item.id);
  return NextResponse.json(item);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const orgId = (session as any).currentOrganizationId as string | undefined;
  if (!orgId) return NextResponse.json({ error: "Sin organización" }, { status: 400 });

  const { id } = await params;
  const existing = await prisma.contentItem.findFirst({ where: { id, organizationId: orgId } });
  if (!existing) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  await removeContentItemEvent(orgId, existing.googleEventId);
  await prisma.contentItem.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
