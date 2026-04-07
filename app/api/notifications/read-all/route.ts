import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { auth } from "@/auth";

export async function PATCH() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentOrganizationId = (session as any).currentOrganizationId;
    if (!currentOrganizationId) {
      return NextResponse.json({ error: "No organization context" }, { status: 400 });
    }

    await prisma.notification.updateMany({
      where: { organizationId: currentOrganizationId, isRead: false },
      data: { isRead: true },
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error: any) {
    console.error("PATCH /api/notifications/read-all error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
