import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";

const VIDEO_TYPES = ["video", "reel"];

/** Piezas del calendario (video/reel) que aún no tienen un video registrado. */
export async function GET() {
  const session = await auth();
  const organizationId = (session as any)?.currentOrganizationId;
  if (!session?.user || !organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const candidates = await prisma.contentItem.findMany({
    where: { organizationId, type: { in: VIDEO_TYPES }, videos: { none: {} } },
    orderBy: { date: "asc" },
    take: 300,
    select: {
      id: true,
      title: true,
      date: true,
      type: true,
      hook: true,
      clientId: true,
      client: { select: { name: true } },
    },
  });

  return NextResponse.json(candidates);
}

/** Crea un video por cada pieza seleccionada, vinculado a la pieza y a su cliente de contenido. */
export async function POST(req: Request) {
  const session = await auth();
  const organizationId = (session as any)?.currentOrganizationId;
  if (!session?.user || !organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const itemIds = Array.isArray(body?.itemIds) ? body.itemIds.filter((id: unknown) => typeof id === "string") : [];
  if (!itemIds.length || itemIds.length > 300) return NextResponse.json({ error: "Selecciona entre 1 y 300 piezas" }, { status: 400 });

  const items = await prisma.contentItem.findMany({
    where: { id: { in: itemIds }, organizationId, type: { in: VIDEO_TYPES } },
    select: { id: true, title: true, date: true, hook: true, clientId: true },
  });

  let created = 0;
  let skipped = 0;
  for (const item of items) {
    const duplicate = await prisma.video.findFirst({ where: { organizationId, contentItemId: item.id }, select: { id: true } });
    if (duplicate) {
      skipped++;
      continue;
    }
    await prisma.video.create({
      data: {
        organizationId,
        title: item.title,
        platform: "Otra",
        publishedAt: item.date,
        hook: item.hook,
        contentItemId: item.id,
        contentClientId: item.clientId,
      },
    });
    created++;
  }

  return NextResponse.json({ created, skipped });
}
