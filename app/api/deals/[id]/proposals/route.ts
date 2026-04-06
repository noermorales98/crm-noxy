import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { auth } from "@/auth";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const organizationId = (session as any).currentOrganizationId;
    const { id: dealId } = await params;

    const deal = await prisma.deal.findFirst({ where: { id: dealId, organizationId } });
    if (!deal) return NextResponse.json({ error: "Deal no encontrado" }, { status: 404 });

    const body = await req.json();
    const { title, items = [], notes, validUntil } = body;

    if (!title) return NextResponse.json({ error: "title es requerido" }, { status: 400 });

    const proposal = await prisma.proposal.create({
      data: {
        title,
        notes: notes || null,
        validUntil: validUntil ? new Date(validUntil) : null,
        dealId,
        organizationId,
        items: {
          create: items.map((item: any, index: number) => ({
            description: item.description,
            quantity: parseFloat(item.quantity) || 1,
            unitPrice: parseFloat(item.unitPrice) || 0,
            order: index,
          })),
        },
      },
      include: { items: { orderBy: { order: "asc" } } },
    });

    return NextResponse.json(proposal, { status: 201 });
  } catch (error) {
    console.error("POST /api/deals/[id]/proposals error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const organizationId = (session as any).currentOrganizationId;
    const { id: dealId } = await params;

    const { proposalId } = await req.json();
    if (!proposalId) return NextResponse.json({ error: "proposalId requerido" }, { status: 400 });

    const proposal = await prisma.proposal.findFirst({ where: { id: proposalId, dealId, organizationId } });
    if (!proposal) return NextResponse.json({ error: "Propuesta no encontrada" }, { status: 404 });

    await prisma.proposal.delete({ where: { id: proposalId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/deals/[id]/proposals error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const organizationId = (session as any).currentOrganizationId;
    const { id: dealId } = await params;

    const body = await req.json();
    const { proposalId, status } = body;

    if (!proposalId || !status) {
      return NextResponse.json({ error: "proposalId y status son requeridos" }, { status: 400 });
    }

    const proposal = await prisma.proposal.findFirst({ where: { id: proposalId, dealId, organizationId } });
    if (!proposal) return NextResponse.json({ error: "Propuesta no encontrada" }, { status: 404 });

    const updated = await prisma.proposal.update({
      where: { id: proposalId },
      data: { status },
      include: { items: { orderBy: { order: "asc" } } },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/deals/[id]/proposals error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
