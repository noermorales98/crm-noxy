import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    const currentOrganizationId = (session as any)?.currentOrganizationId;

    if (!session?.user || !currentOrganizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    const campaign = await prisma.emailCampaign.findFirst({
      where: { id, organizationId: currentOrganizationId },
      include: {
        company: { select: { name: true } },
        project: { select: { name: true } },
        targetForm: { select: { name: true } },
        steps: { orderBy: { order: "asc" } },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found or unauthorized" }, { status: 404 });
    }

    // Conteo de logs por status
    const logCounts = await prisma.emailLog.groupBy({
      by: ["status"],
      where: { campaignId: id },
      _count: { _all: true },
    });
    const logsByStatus: Record<string, number> = {};
    for (const row of logCounts) {
      logsByStatus[row.status] = row._count._all;
    }

    // Próximo envío pendiente (menor scheduledAt futuro entre los PENDING)
    const nextPending = await prisma.emailLog.findFirst({
      where: {
        campaignId: id,
        status: "PENDING",
        scheduledAt: { gt: new Date() },
      },
      orderBy: { scheduledAt: "asc" },
      select: { scheduledAt: true },
    });

    return NextResponse.json({
      ...campaign,
      logsByStatus,
      nextScheduledAt: nextPending?.scheduledAt ?? null,
    });
  } catch (error: any) {
    console.error("GET /api/campaigns/[id] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    const currentOrganizationId = (session as any)?.currentOrganizationId;
    
    if (!session?.user || !currentOrganizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    const campaign = await prisma.emailCampaign.findFirst({
      where: { id, organizationId: currentOrganizationId }
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found or unauthorized" }, { status: 404 });
    }

    await prisma.emailCampaign.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/campaigns/[id] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
