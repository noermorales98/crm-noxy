import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";
import { parseReminderDaysBefore } from "@/src/lib/content-reminder-options";

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
  if (Array.isArray(body.hooksAlt)) {
    data.hooksAlt = JSON.stringify(body.hooksAlt.filter((h: any) => typeof h === "string" && h.trim()));
  }
  if (typeof body.reminderEnabled === "boolean") data.reminderEnabled = body.reminderEnabled;
  if (body.reminderDaysBefore !== undefined) {
    data.reminderDaysBefore = parseReminderDaysBefore(body.reminderDaysBefore, existing.reminderDaysBefore);
  }

  const item = await prisma.contentItem.update({ where: { id }, data });
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

  await prisma.contentItem.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
