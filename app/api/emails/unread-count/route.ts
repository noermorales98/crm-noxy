import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { auth } from "@/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentOrganizationId = (session as any).currentOrganizationId;
    if (!currentOrganizationId) {
      return NextResponse.json({ error: "No organization context" }, { status: 400 });
    }

    const count = await prisma.email.count({
      where: {
        organizationId: currentOrganizationId,
        type: "RECEIVED",
        isRead: false,
        isArchived: false,
        isSpam: false,
      },
    });

    return NextResponse.json({ count }, { status: 200 });
  } catch (error: any) {
    console.error("GET /api/emails/unread-count error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
