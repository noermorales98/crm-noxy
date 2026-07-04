import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";

type Params = { params: Promise<{ id: string; revisionId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  const orgId = (session as any)?.currentOrganizationId as string | undefined;
  if (!session?.user || !orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, revisionId } = await params;

  const revision = await prisma.kbPageRevision.findFirst({
    where: { id: revisionId, pageId: id, organizationId: orgId },
  });

  if (!revision) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(revision);
}
