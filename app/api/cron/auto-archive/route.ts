import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { archiveStaleWonDeals } from "@/src/lib/month-close-service";

// Archiva los ganados que ya están en la última etapa ganadora de su pipeline y llevan `autoArchiveDays` días ganados.
// Un deal en «En producción» o «Anticipo pagado» no se archiva: sigue siendo trabajo en curso.
export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if ((!cronSecret && process.env.NODE_ENV === "production") || (cronSecret && authHeader !== `Bearer ${cronSecret}`)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const organizations = await prisma.organization.findMany({
      where: { autoArchiveDays: { gt: 0 } },
      select: { id: true, autoArchiveDays: true },
    });

    let totalArchived = 0;
    for (const org of organizations) {
      totalArchived += await archiveStaleWonDeals(org.id, org.autoArchiveDays);
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
