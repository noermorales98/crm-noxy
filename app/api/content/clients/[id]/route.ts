import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";
import { parseReminderDaysBefore } from "@/src/lib/content-reminder-options";

async function getClient(id: string, orgId: string) {
  return prisma.contentClient.findFirst({
    where: { id, organizationId: orgId },
    include: { phones: { orderBy: { createdAt: "asc" } } },
  });
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const orgId = (session as any).currentOrganizationId as string | undefined;
  if (!orgId) return NextResponse.json({ error: "Sin organización" }, { status: 400 });

  const { id } = await params;
  const client = await getClient(id, orgId);
  if (!client) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json(client);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const orgId = (session as any).currentOrganizationId as string | undefined;
  if (!orgId) return NextResponse.json({ error: "Sin organización" }, { status: 400 });

  const { id } = await params;
  const existing = await getClient(id, orgId);
  if (!existing) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
  if (typeof body.kind === "string") data.kind = body.kind === "cliente" ? "cliente" : "marca";
  if (typeof body.description === "string") data.description = body.description;
  if (typeof body.context === "string") data.context = body.context;
  if (typeof body.isActive === "boolean") data.isActive = body.isActive;
  // Regenerar enlace público (invalida el anterior)
  if (body.regenerateToken === true) data.publicToken = crypto.randomUUID().replace(/-/g, "");
  if (typeof body.reminderHour === "number" && Number.isFinite(body.reminderHour)) {
    data.reminderHour = Math.max(0, Math.min(23, Math.floor(body.reminderHour)));
  }
  if (typeof body.reminderMinute === "number" && Number.isFinite(body.reminderMinute)) {
    data.reminderMinute = Math.max(0, Math.min(59, Math.floor(body.reminderMinute)));
  }
  if (body.reminderDaysBefore !== undefined) {
    data.reminderDaysBefore = parseReminderDaysBefore(body.reminderDaysBefore, existing.reminderDaysBefore);
  }

  const client = await prisma.contentClient.update({
    where: { id },
    data,
    include: { phones: { orderBy: { createdAt: "asc" } } },
  });

  if (body.applyToEnabledItems === true && typeof data.reminderDaysBefore === "number") {
    await prisma.contentItem.updateMany({
      where: { clientId: id, organizationId: orgId, reminderEnabled: true },
      data: { reminderDaysBefore: data.reminderDaysBefore },
    });
  }

  return NextResponse.json(client);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const orgId = (session as any).currentOrganizationId as string | undefined;
  if (!orgId) return NextResponse.json({ error: "Sin organización" }, { status: 400 });

  const { id } = await params;
  const existing = await getClient(id, orgId);
  if (!existing) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  await prisma.contentClient.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
