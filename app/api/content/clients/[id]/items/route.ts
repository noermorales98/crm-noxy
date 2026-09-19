import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";

const ALLOWED_TYPES = ["video", "reel", "flyer", "historia", "entrega", "edicion"];

function parseDate(value: unknown): Date | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const d = new Date(value.length === 10 ? `${value}T12:00:00Z` : value);
  return isNaN(d.getTime()) ? null : d;
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const orgId = (session as any).currentOrganizationId as string | undefined;
  if (!orgId) return NextResponse.json({ error: "Sin organización" }, { status: 400 });

  const { id } = await params;
  const client = await prisma.contentClient.findFirst({ where: { id, organizationId: orgId }, select: { id: true } });
  if (!client) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month"); // YYYY-MM
  let where: any = { clientId: id, organizationId: orgId };
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [y, m] = month.split("-").map(Number);
    const from = new Date(Date.UTC(y, m - 1, 1));
    const to = new Date(Date.UTC(y, m, 1));
    where.date = { gte: from, lt: to };
  }

  const items = await prisma.contentItem.findMany({
    where,
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json(items);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const orgId = (session as any).currentOrganizationId as string | undefined;
  if (!orgId) return NextResponse.json({ error: "Sin organización" }, { status: 400 });

  const { id } = await params;
  const client = await prisma.contentClient.findFirst({ where: { id, organizationId: orgId }, select: { id: true } });
  if (!client) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });

  const date = parseDate(body.date);
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!date || !title) return NextResponse.json({ error: "Fecha y título son obligatorios" }, { status: 400 });

  const type = ALLOWED_TYPES.includes(body.type) ? body.type : "video";
  const hooksAlt = Array.isArray(body.hooksAlt) ? JSON.stringify(body.hooksAlt.filter((h: any) => typeof h === "string" && h.trim())) : null;

  const reminderEnabled = typeof body.reminderEnabled === "boolean" ? body.reminderEnabled : false;
  let reminderDaysBefore = 1;
  if (typeof body.reminderDaysBefore === "number" && Number.isFinite(body.reminderDaysBefore)) {
    reminderDaysBefore = Math.max(0, Math.min(30, Math.floor(body.reminderDaysBefore)));
  } else if (typeof body.reminderDaysBefore === "string" && body.reminderDaysBefore.trim() !== "") {
    const n = parseInt(body.reminderDaysBefore, 10);
    if (!Number.isNaN(n)) reminderDaysBefore = Math.max(0, Math.min(30, n));
  }

  const item = await prisma.contentItem.create({
    data: {
      clientId: id,
      organizationId: orgId,
      date,
      type,
      title,
      time: body.time || null,
      hook: body.hook || null,
      hooksAlt,
      script: body.script || null,
      caption: body.caption || null,
      cta: body.cta || null,
      tips: body.tips || null,
      note: body.note || null,
      reminderEnabled,
      reminderDaysBefore,
    },
  });

  return NextResponse.json(item, { status: 201 });
}
