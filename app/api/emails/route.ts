import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { auth } from "@/auth";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentOrganizationId = (session as any).currentOrganizationId;
    if (!currentOrganizationId) {
      return NextResponse.json({ error: "No organization context" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get("companyId");
    const folder = searchParams.get("folder") || "inbox"; // inbox | sent | archived
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const skip = (page - 1) * limit;

    const where: any = { organizationId: currentOrganizationId };

    if (companyId) {
      // Verify company belongs to org
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { organizationId: true },
      });
      if (!company || company.organizationId !== currentOrganizationId) {
        return NextResponse.json({ error: "Company not found" }, { status: 404 });
      }
      where.companyId = companyId;
    }

    if (folder === "inbox") {
      where.type = "RECEIVED";
      where.isArchived = false;
      where.isSpam = false;
    } else if (folder === "sent") {
      where.type = "SENT";
      where.isArchived = false;
    } else if (folder === "archived") {
      where.isArchived = true;
      where.isSpam = false;
    } else if (folder === "spam") {
      where.isSpam = true;
    }

    const [emails, total] = await Promise.all([
      prisma.email.findMany({
        where,
        orderBy: { receivedAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          subject: true,
          fromAddress: true,
          fromName: true,
          toAddress: true,
          type: true,
          isRead: true,
          isArchived: true,
          isSpam: true,
          receivedAt: true,
          companyId: true,
          company: { select: { id: true, name: true } },
        },
      }),
      prisma.email.count({ where }),
    ]);

    return NextResponse.json({ emails, total, page, limit }, { status: 200 });
  } catch (error: any) {
    console.error("GET /api/emails error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
