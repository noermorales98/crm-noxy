import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  const orgId = (session as { currentOrganizationId?: string })?.currentOrganizationId;
  if (!session?.user || !orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const page = await prisma.kbPage.findFirst({
    where: { id, organizationId: orgId },
    select: { id: true },
  });
  if (!page) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const suggestions = await prisma.kbSuggestion.findMany({
    where: { pageId: id, organizationId: orgId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(suggestions);
}
