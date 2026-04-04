import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { auth } from "@/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const organizationId = (session as any).currentOrganizationId;
    if (!organizationId) return NextResponse.json({ error: "No organization context" }, { status: 400 });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const [
      totalDeals,
      dealsThisMonth,
      wonStages,
      lostStages,
      allActiveDeals,
      revenueData,
      followUpsData,
    ] = await Promise.all([
      prisma.deal.count({ where: { organizationId } }),
      prisma.deal.count({ where: { organizationId, createdAt: { gte: startOfMonth } } }),
      prisma.stage.findMany({ where: { pipeline: { organizationId }, isWon: true }, select: { id: true } }),
      prisma.stage.findMany({ where: { pipeline: { organizationId }, isLost: true }, select: { id: true } }),
      prisma.deal.findMany({
        where: { organizationId },
        select: { value: true, stage: { select: { isWon: true, isLost: true } } },
      }),
      prisma.payment.aggregate({
        where: { organizationId, status: "RECIBIDO", receivedAt: { gte: startOfMonth, lte: endOfMonth } },
        _sum: { amount: true },
      }),
      prisma.deal.findMany({
        where: {
          organizationId,
          followUpAt: { lte: now },
          stage: { isWon: false, isLost: false },
        },
        select: { id: true, title: true, followUpAt: true, contact: { select: { firstName: true, lastName: true } } },
        orderBy: { followUpAt: "asc" },
        take: 10,
      }),
    ]);

    const wonStageIds = wonStages.map((s) => s.id);
    const lostStageIds = lostStages.map((s) => s.id);

    const wonDeals = allActiveDeals.filter((d) => d.stage.isWon).length;
    const lostDeals = allActiveDeals.filter((d) => d.stage.isLost).length;
    const activeDeals = allActiveDeals.filter((d) => !d.stage.isWon && !d.stage.isLost);

    const pipelineValue = activeDeals.reduce((sum, d) => sum + (d.value ?? 0), 0);
    const closingRate = totalDeals > 0 ? Math.round((wonDeals / totalDeals) * 100) : 0;
    const revenueThisMonth = revenueData._sum.amount ?? 0;
    const followUpsDue = followUpsData.length;

    return NextResponse.json({
      totalDeals,
      dealsThisMonth,
      wonDeals,
      lostDeals,
      followUpsDue,
      closingRate,
      pipelineValue,
      revenueThisMonth,
      followUps: followUpsData,
    });
  } catch (error) {
    console.error("GET /api/sales/metrics error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
