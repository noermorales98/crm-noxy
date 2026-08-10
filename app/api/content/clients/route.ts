import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const orgId = (session as any).currentOrganizationId as string | undefined;
  if (!orgId) return NextResponse.json({ error: "Sin organización" }, { status: 400 });

  const clients = await prisma.contentClient.findMany({
    where: { organizationId: orgId },
    orderBy: { name: "asc" },
    include: {
      _count: { select: { items: true, phones: true } },
    },
  });

  return NextResponse.json(clients);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const orgId = (session as any).currentOrganizationId as string | undefined;
  if (!orgId) return NextResponse.json({ error: "Sin organización" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });

  const client = await prisma.contentClient.create({
    data: {
      name,
      kind: body?.kind === "cliente" ? "cliente" : "marca",
      description: typeof body?.description === "string" ? body.description : null,
      context: typeof body?.context === "string" ? body.context : null,
      organizationId: orgId,
    },
  });

  return NextResponse.json(client, { status: 201 });
}
