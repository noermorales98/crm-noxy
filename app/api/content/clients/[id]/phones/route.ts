import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const orgId = (session as any).currentOrganizationId as string | undefined;
  if (!orgId) return NextResponse.json({ error: "Sin organización" }, { status: 400 });

  const { id } = await params;
  const client = await prisma.contentClient.findFirst({ where: { id, organizationId: orgId }, select: { id: true } });
  if (!client) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const phone = typeof body?.phone === "string" ? body.phone.replace(/[^\d+]/g, "") : "";
  const apiKey = typeof body?.apiKey === "string" ? body.apiKey.trim() : "";
  if (!phone || !apiKey) return NextResponse.json({ error: "Número y apikey son obligatorios" }, { status: 400 });

  const entry = await prisma.contentPhone.create({
    data: {
      clientId: id,
      phone,
      apiKey,
      label: typeof body?.label === "string" && body.label.trim() ? body.label.trim() : null,
    },
  });

  return NextResponse.json(entry, { status: 201 });
}
