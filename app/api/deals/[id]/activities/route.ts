import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { auth } from "@/auth";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const organizationId = (session as any).currentOrganizationId;
    const { id: dealId } = await params;

    const { activityId } = await req.json();
    if (!activityId) return NextResponse.json({ error: "activityId requerido" }, { status: 400 });

    const activity = await prisma.activityLog.findFirst({
      where: { id: activityId, dealId, organizationId },
    });
    if (!activity) return NextResponse.json({ error: "Actividad no encontrada" }, { status: 404 });

    await prisma.activityLog.delete({ where: { id: activityId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/deals/[id]/activities error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const organizationId = (session as any).currentOrganizationId;
    const { id: dealId } = await params;

    const deal = await prisma.deal.findFirst({ where: { id: dealId, organizationId } });
    if (!deal) return NextResponse.json({ error: "Deal no encontrado" }, { status: 404 });

    const body = await req.json();
    const { type, description } = body;

    if (!type || !description) {
      return NextResponse.json({ error: "type y description son requeridos" }, { status: 400 });
    }

    const activity = await prisma.activityLog.create({
      data: {
        type,
        description,
        dealId,
        organizationId,
        createdById: session.user?.id || null,
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(activity, { status: 201 });
  } catch (error) {
    console.error("POST /api/deals/[id]/activities error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
