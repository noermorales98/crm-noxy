import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";

async function isUnderAncestor(
  orgId: string,
  ancestorId: string,
  nodeId: string | null
): Promise<boolean> {
  let current = nodeId;
  while (current) {
    if (current === ancestorId) return true;
    const row = await prisma.kbPage.findFirst({
      where: { id: current, organizationId: orgId },
      select: { parentId: true },
    });
    if (!row) break;
    current = row.parentId;
  }
  return false;
}

async function reindexSiblings(orgId: string, parentId: string | null) {
  const siblings = await prisma.kbPage.findMany({
    where: { organizationId: orgId, parentId },
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
    select: { id: true },
  });

  await prisma.$transaction(
    siblings.map((s, i) =>
      prisma.kbPage.updateMany({
        where: { id: s.id, organizationId: orgId },
        data: { sortOrder: i },
      })
    )
  );
}

export async function POST(req: Request) {
  const session = await auth();
  const orgId = (session as { currentOrganizationId?: string })?.currentOrganizationId;
  if (!session?.user || !orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id, parentId: rawParentId, index } = await req.json();
    if (!id || typeof index !== "number") {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    const newParentId = rawParentId || null;
    const targetIndex = Math.max(0, Math.floor(index));

    const page = await prisma.kbPage.findFirst({
      where: { id, organizationId: orgId },
      select: { id: true, parentId: true, isFolder: true },
    });
    if (!page) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (page.isFolder && newParentId) {
      if (newParentId === id) {
        return NextResponse.json({ error: "No puedes mover una carpeta dentro de sí misma" }, { status: 400 });
      }
      if (await isUnderAncestor(orgId, id, newParentId)) {
        return NextResponse.json({ error: "No puedes mover una carpeta dentro de sus subcarpetas" }, { status: 400 });
      }
      const targetParent = await prisma.kbPage.findFirst({
        where: { id: newParentId, organizationId: orgId },
        select: { isFolder: true },
      });
      if (!targetParent) {
        return NextResponse.json({ error: "Destino no encontrado" }, { status: 404 });
      }
      if (!targetParent.isFolder) {
        return NextResponse.json(
          { error: "Las carpetas solo pueden moverse a otras carpetas o a la raíz" },
          { status: 400 }
        );
      }
    }

    const oldParentId = page.parentId;

    const targetSiblings = await prisma.kbPage.findMany({
      where: {
        organizationId: orgId,
        parentId: newParentId,
        id: { not: id },
      },
      orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
      select: { id: true },
    });

    const clampedIndex = Math.min(targetIndex, targetSiblings.length);
    const orderedIds = targetSiblings.map((s) => s.id);
    orderedIds.splice(clampedIndex, 0, id);

    await prisma.$transaction([
      prisma.kbPage.updateMany({
        where: { id, organizationId: orgId },
        data: { parentId: newParentId },
      }),
      ...orderedIds.map((sid, i) =>
        prisma.kbPage.updateMany({
          where: { id: sid, organizationId: orgId },
          data: { sortOrder: i },
        })
      ),
    ]);

    if (oldParentId !== newParentId) {
      await reindexSiblings(orgId, oldParentId);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[kb move]", err);
    return NextResponse.json(
      { error: "Error al mover", detail: err instanceof Error ? err.message : "Unknown" },
      { status: 500 }
    );
  }
}
