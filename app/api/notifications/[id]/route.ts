import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { auth } from "@/auth";

export async function PATCH(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentOrganizationId = (session as any).currentOrganizationId;
    if (!currentOrganizationId) {
      return NextResponse.json({ error: "No organization context" }, { status: 400 });
    }

    const { id } = await context.params;

    const notification = await prisma.notification.findUnique({
      where: { id },
      select: { organizationId: true },
    });

    if (!notification || notification.organizationId !== currentOrganizationId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error: any) {
    console.error("PATCH /api/notifications/[id] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentOrganizationId = (session as any).currentOrganizationId;
    if (!currentOrganizationId) {
      return NextResponse.json({ error: "No organization context" }, { status: 400 });
    }

    const { id } = await context.params;

    const notification = await prisma.notification.findUnique({
      where: { id },
      select: { organizationId: true },
    });

    if (!notification || notification.organizationId !== currentOrganizationId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.notification.delete({
      where: { id },
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error: any) {
    console.error("DELETE /api/notifications/[id] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
