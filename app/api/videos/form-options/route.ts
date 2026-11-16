import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";

/** Opciones para los selects del formulario manual: clientes de contenido y sus piezas video/reel. */
export async function GET() {
  const session = await auth();
  const organizationId = (session as any)?.currentOrganizationId;
  if (!session?.user || !organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [clients, items] = await Promise.all([
    prisma.contentClient.findMany({
      where: { organizationId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.contentItem.findMany({
      where: { organizationId, type: { in: ["video", "reel"] } },
      select: { id: true, title: true, date: true, type: true, clientId: true },
      orderBy: { date: "desc" },
      take: 800,
    }),
  ]);

  return NextResponse.json({ clients, items });
}
