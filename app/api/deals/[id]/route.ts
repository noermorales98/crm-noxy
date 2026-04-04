import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { auth } from "@/auth";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const organizationId = (session as any).currentOrganizationId;
    const { id } = await params;

    const deal = await prisma.deal.findFirst({
      where: { id, organizationId },
      include: {
        stage: { include: { pipeline: { include: { stages: { orderBy: { order: "asc" } } } } } },
        contact: true,
        company: true,
        activities: {
          orderBy: { createdAt: "desc" },
          include: { createdBy: { select: { id: true, name: true, email: true } } },
        },
        proposals: {
          orderBy: { createdAt: "desc" },
          include: { items: { orderBy: { order: "asc" } } },
        },
        payments: { orderBy: { createdAt: "desc" } },
        tasks: { orderBy: { createdAt: "desc" }, include: { category: true } },
      },
    });

    if (!deal) return NextResponse.json({ error: "Deal no encontrado" }, { status: 404 });

    return NextResponse.json(deal);
  } catch (error) {
    console.error("GET /api/deals/[id] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const organizationId = (session as any).currentOrganizationId;
    const { id } = await params;

    const existing = await prisma.deal.findFirst({ where: { id, organizationId } });
    if (!existing) return NextResponse.json({ error: "Deal no encontrado" }, { status: 404 });

    await prisma.deal.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/deals/[id] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
