import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { auth } from "@/auth";

/** Busca deals por título o cliente, también archivados (para vincular cotizaciones a ventas ya cerradas). */
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const organizationId = (session as { currentOrganizationId?: string }).currentOrganizationId;
    if (!organizationId) return NextResponse.json({ error: "No organization context" }, { status: 400 });

    const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
    const deals = await prisma.deal.findMany({
      where: {
        organizationId,
        ...(q
          ? { OR: [{ title: { contains: q } }, { contact: { firstName: { contains: q } } }, { contact: { lastName: { contains: q } } }, { company: { name: { contains: q } } }] }
          : {}),
      },
      orderBy: { updatedAt: "desc" },
      take: 20,
      select: { id: true, title: true, value: true, currency: true, isArchived: true, wonAt: true, stage: { select: { name: true, isWon: true, isLost: true } } },
    });
    return NextResponse.json(deals);
  } catch (error) {
    console.error("GET /api/deals/search error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
