import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { auth } from "@/auth";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentOrganizationId = (session as any).currentOrganizationId;

    const categories = await prisma.taskCategory.findMany({
      where: {
        organizationId: currentOrganizationId,
      },
      include: {
        company: { select: { name: true } }
      },
      orderBy: { createdAt: "asc" }
    });

    return NextResponse.json(categories);
  } catch (error: any) {
    console.error("GET /api/task-categories error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentOrganizationId = (session as any).currentOrganizationId;

    const body = await req.json();
    const { name, color, companyId } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const category = await prisma.taskCategory.create({
      data: {
        name,
        color: color || "#3B82F6",
        companyId: companyId || null,
        organizationId: currentOrganizationId
      },
      include: {
        company: { select: { name: true } }
      }
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/task-categories error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
