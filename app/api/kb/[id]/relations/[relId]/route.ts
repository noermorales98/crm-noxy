import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";

type Params = { params: Promise<{ id: string; relId: string }> };

export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth();
  const orgId = (session as any)?.currentOrganizationId as string | undefined;
  if (!session?.user || !orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, relId } = await params;

  // Verify ownership through the page
  const relation = await prisma.kbPageRelation.findFirst({
    where: { id: relId, page: { id, organizationId: orgId } },
  });
  if (!relation) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.kbPageRelation.delete({ where: { id: relId } });
  return new NextResponse(null, { status: 204 });
}
