import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";
import { summarizeReferrals, type ReferredDeal } from "@/src/lib/referrals";

// Cuántos referidos trae cada cliente o contacto (leads con «Referido por»).
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const organizationId = (session as any).currentOrganizationId;
    if (!organizationId) return NextResponse.json({ error: "No organization context" }, { status: 400 });

    const deals = await prisma.deal.findMany({
      where: { organizationId, isArchived: false, OR: [{ referredByClientId: { not: null } }, { referredByContactId: { not: null } }] },
      select: {
        id: true,
        value: true,
        currency: true,
        stage: { select: { isWon: true, isLost: true } },
        referredByClient: { select: { id: true, name: true } },
        referredByContact: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    const referred: ReferredDeal[] = deals.map((d) => {
      const client = d.referredByClient;
      const contact = d.referredByContact;
      return {
        id: d.id,
        value: d.value,
        currency: d.currency,
        stage: d.stage,
        referrerId: client ? `client:${client.id}` : `contact:${contact!.id}`,
        referrerName: client ? client.name : `${contact!.firstName} ${contact!.lastName ?? ""}`.trim(),
      };
    });

    const noReferrer = await prisma.deal.count({ where: { organizationId, isArchived: false, referredByClientId: null, referredByContactId: null } });
    return NextResponse.json({ referrers: summarizeReferrals(referred), dealsWithoutReferrer: noReferrer });
  } catch (error) {
    console.error("GET /api/reports/referrals error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
