import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";

// Reverse lookup: given an entity (e.g. a Project), list the KB pages/folders related to it.
// Creating/removing a relation is still done from the page side via
// POST /api/kb/[id]/relations and DELETE /api/kb/[id]/relations/[relId].
export async function GET(req: Request) {
  const session = await auth();
  const orgId = (session as any)?.currentOrganizationId as string | undefined;
  if (!session?.user || !orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const entityType = searchParams.get("entityType");
  const entityId = searchParams.get("entityId");

  if (!entityType || !entityId) {
    return NextResponse.json({ error: "entityType and entityId are required" }, { status: 400 });
  }

  const relations = await prisma.kbPageRelation.findMany({
    where: {
      entityType: entityType as any,
      entityId,
      page: { organizationId: orgId },
    },
    include: {
      page: { select: { id: true, title: true, emoji: true, isFolder: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(relations);
}
