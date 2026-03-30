import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { auth } from "@/auth";

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const currentOrganizationId = (session as any).currentOrganizationId;
    const { id } = await context.params;

    const body = await req.json();
    const { name, color, companyId } = body;

    const category = await prisma.taskCategory.findFirst({
      where: { id, organizationId: currentOrganizationId }
    });

    if (!category) {
      return NextResponse.json({ error: "Category not found or unauthorized" }, { status: 404 });
    }

    const updatedCategory = await prisma.taskCategory.update({
      where: { id },
      data: {
        name,
        color,
        companyId: companyId === "" ? null : companyId
      },
      include: {
        company: { select: { name: true } }
      }
    });

    return NextResponse.json(updatedCategory);
  } catch (error: any) {
    console.error("PUT /api/task-categories/[id] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const currentOrganizationId = (session as any).currentOrganizationId;
    const { id } = await context.params;

    const category = await prisma.taskCategory.findFirst({
      where: { id, organizationId: currentOrganizationId }
    });

    if (!category) {
      return NextResponse.json({ error: "Category not found or unauthorized" }, { status: 404 });
    }

    await prisma.taskCategory.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/task-categories/[id] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
