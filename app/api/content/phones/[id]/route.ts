import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";
import { sendCallMeBotMessage } from "@/src/lib/whatsapp";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const orgId = session.currentOrganizationId;
  if (!orgId) return NextResponse.json({ error: "Sin organización" }, { status: 400 });

  const { id } = await params;
  const phone = await prisma.contentPhone.findFirst({
    where: { id, client: { organizationId: orgId } },
    include: { client: { select: { name: true } } },
  });
  if (!phone) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const message = `Prueba Noxy — Gestión de contenido\n\nSi ves este mensaje, CallMeBot está bien configurado para *${phone.client.name}*.`;
  const result = await sendCallMeBotMessage(phone.phone, phone.apiKey, message);
  if (!result.ok) {
    return NextResponse.json({ error: result.error || "CallMeBot rechazó el envío" }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const orgId = (session as any).currentOrganizationId as string | undefined;
  if (!orgId) return NextResponse.json({ error: "Sin organización" }, { status: 400 });

  const { id } = await params;
  const phone = await prisma.contentPhone.findFirst({
    where: { id, client: { organizationId: orgId } },
  });
  if (!phone) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  await prisma.contentPhone.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
