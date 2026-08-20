import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const organizations = await prisma.organization.findMany({
      where: { autoArchiveDays: { gt: 0 } },
      select: { id: true, autoArchiveDays: true },
    });

    let totalArchived = 0;

    for (const org of organizations) {
      const archiveThreshold = new Date();
      archiveThreshold.setDate(archiveThreshold.getDate() - org.autoArchiveDays);

      // Find all deals in won stages for this organization that are older than threshold
      const result = await prisma.deal.updateMany({
        where: {
          organizationId: org.id,
          isArchived: false,
          stage: { isWon: true },
          updatedAt: { lte: archiveThreshold },
        },
        data: {
          isArchived: true,
          archivedAt: new Date(),
        },
      });

      totalArchived += result.count;
    }

    return NextResponse.json({
      success: true,
      processedOrganizations: organizations.length,
      dealsArchived: totalArchived,
    });
  } catch (error) {
    console.error("GET /api/cron/auto-archive error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
