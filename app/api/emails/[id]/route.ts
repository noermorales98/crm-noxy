import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { auth } from "@/auth";

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentOrganizationId = (session as any).currentOrganizationId;
    if (!currentOrganizationId) {
      return NextResponse.json({ error: "No organization context" }, { status: 400 });
    }

    const email = await prisma.email.findUnique({
      where: { id },
      include: { company: { select: { id: true, name: true } } },
    });

    if (!email || email.organizationId !== currentOrganizationId) {
      return NextResponse.json({ error: "Email not found" }, { status: 404 });
    }

    // Mark as read automatically on open
    if (!email.isRead) {
      await prisma.email.update({ where: { id }, data: { isRead: true } });
    }

    return NextResponse.json({ ...email, isRead: true }, { status: 200 });
  } catch (error: any) {
    console.error("GET /api/emails/[id] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentOrganizationId = (session as any).currentOrganizationId;
    if (!currentOrganizationId) {
      return NextResponse.json({ error: "No organization context" }, { status: 400 });
    }

    const email = await prisma.email.findUnique({
      where: { id },
      select: { organizationId: true },
    });

    if (!email || email.organizationId !== currentOrganizationId) {
      return NextResponse.json({ error: "Email not found" }, { status: 404 });
    }

    const body = await req.json();
    const { isRead, isArchived } = body;

    const dataToUpdate: any = {};
    if (typeof isRead === "boolean") dataToUpdate.isRead = isRead;
    if (typeof isArchived === "boolean") dataToUpdate.isArchived = isArchived;

    const updated = await prisma.email.update({ where: { id }, data: dataToUpdate });
    return NextResponse.json(updated, { status: 200 });
  } catch (error: any) {
    console.error("PATCH /api/emails/[id] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentOrganizationId = (session as any).currentOrganizationId;
    if (!currentOrganizationId) {
      return NextResponse.json({ error: "No organization context" }, { status: 400 });
    }

    const email = await prisma.email.findUnique({
      where: { id },
      select: { organizationId: true },
    });

    if (!email || email.organizationId !== currentOrganizationId) {
      return NextResponse.json({ error: "Email not found" }, { status: 404 });
    }

    await prisma.email.delete({ where: { id } });
    return NextResponse.json({ message: "Email deleted" }, { status: 200 });
  } catch (error: any) {
    console.error("DELETE /api/emails/[id] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
