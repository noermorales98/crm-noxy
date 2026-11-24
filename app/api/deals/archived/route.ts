import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { auth } from "@/auth";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const organizationId = (session as any).currentOrganizationId;
    if (!organizationId) return NextResponse.json({ error: "No organization context" }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month");
    const year = searchParams.get("year");
    const pipelineId = searchParams.get("pipelineId");
    const type = searchParams.get("type"); // won, lost, all

    const where: any = {
      organizationId,
      isArchived: true,
    };

    if (pipelineId) {
      where.pipelineId = pipelineId;
    }

    if (type === "won") {
      where.stage = { isWon: true };
    } else if (type === "lost") {
      where.stage = { isLost: true };
    }

    // El mes de una venta ganada es su fecha de cierre (wonAt); el resto, la fecha de archivado.
    // Así lo cerrado en octubre aparece en octubre aunque se archive el 1 de noviembre.
    let range: { gte: Date; lte: Date } | null = null;
    if (month && year) {
      range = { gte: new Date(parseInt(year), parseInt(month) - 1, 1), lte: new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999) };
    } else if (year) {
      range = { gte: new Date(parseInt(year), 0, 1), lte: new Date(parseInt(year), 11, 31, 23, 59, 59, 999) };
    }
    if (range) {
      where.OR = [{ wonAt: range }, { wonAt: null, archivedAt: range }];
    }

    const deals = await prisma.deal.findMany({
      where,
      orderBy: { archivedAt: "desc" },
      include: {
        stage: true,
        contact: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        company: { select: { id: true, name: true } },
        pipeline: { select: { id: true, name: true } },
        quotes: { orderBy: { issuedAt: "asc" }, select: { id: true, folio: true, status: true, total: true, currency: true } },
      },
    });

    return NextResponse.json(deals);
  } catch (error) {
    console.error("GET /api/deals/archived error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
