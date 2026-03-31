import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { auth } from "@/auth";

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const currentOrganizationId = (session as any).currentOrganizationId;
    const { id: formId } = await context.params;

    const form = await prisma.form.findUnique({
      where: { id: formId, organizationId: currentOrganizationId }
    });
    if (!form) return NextResponse.json({ error: "Form not found" }, { status: 404 });

    const variants = await prisma.formVariant.findMany({
      where: { formId },
      orderBy: { createdAt: "asc" },
      include: { _count: { select: { contacts: true } } }
    });

    return NextResponse.json(variants);
  } catch (error: any) {
    console.error("GET /api/forms/[id]/variants error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const currentOrganizationId = (session as any).currentOrganizationId;
    const { id: formId } = await context.params;

    const form = await prisma.form.findUnique({
      where: { id: formId, organizationId: currentOrganizationId }
    });
    if (!form) return NextResponse.json({ error: "Form not found" }, { status: 404 });

    const { name, description } = await req.json();
    if (!name?.trim()) return NextResponse.json({ error: "El nombre es requerido" }, { status: 400 });

    const variant = await prisma.formVariant.create({
      data: { formId, name: name.trim(), description: description?.trim() || null },
      include: { _count: { select: { contacts: true } } }
    });

    return NextResponse.json(variant, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/forms/[id]/variants error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
