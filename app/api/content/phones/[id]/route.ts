import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";

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
