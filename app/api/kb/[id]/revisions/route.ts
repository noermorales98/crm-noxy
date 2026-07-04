import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  const orgId = (session as any)?.currentOrganizationId as string | undefined;
  if (!session?.user || !orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const page = await prisma.kbPage.findFirst({
    where: { id, organizationId: orgId },
    select: { id: true, isFolder: true },
  });
  if (!page) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (page.isFolder) return NextResponse.json({ revisions: [] });

  const revisions = await prisma.kbPageRevision.findMany({
    where: { pageId: id, organizationId: orgId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      title: true,
      createdAt: true,
      savedById: true,
      content: true,
      isPublished: true,
    },
  });

  return NextResponse.json({
    revisions: revisions.map((r) => ({
      id: r.id,
      title: r.title,
      createdAt: r.createdAt,
      savedById: r.savedById,
      isPublished: r.isPublished,
      preview: (r.content ?? "").slice(0, 120),
    })),
  });
}
