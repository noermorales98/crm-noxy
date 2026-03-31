import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { auth } from "@/auth";

export async function PUT(req: Request, context: { params: Promise<{ id: string; variantId: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const currentOrganizationId = (session as any).currentOrganizationId;
    const { id: formId, variantId } = await context.params;

    const form = await prisma.form.findUnique({
      where: { id: formId, organizationId: currentOrganizationId }
    });
    if (!form) return NextResponse.json({ error: "Form not found" }, { status: 404 });

    const { name, description, isActive } = await req.json();

    const variant = await prisma.formVariant.update({
      where: { id: variantId, formId },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(isActive !== undefined && { isActive }),
      },
      include: { _count: { select: { contacts: true } } }
    });

    return NextResponse.json(variant);
  } catch (error: any) {
    console.error("PUT /api/forms/[id]/variants/[variantId] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string; variantId: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const currentOrganizationId = (session as any).currentOrganizationId;
    const { id: formId, variantId } = await context.params;

    const form = await prisma.form.findUnique({
      where: { id: formId, organizationId: currentOrganizationId }
    });
    if (!form) return NextResponse.json({ error: "Form not found" }, { status: 404 });

    await prisma.formVariant.delete({ where: { id: variantId, formId } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/forms/[id]/variants/[variantId] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
