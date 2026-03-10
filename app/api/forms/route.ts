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

    const forms = await prisma.form.findMany({
      where: {
        organizationId: currentOrganizationId,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        company: {
          select: { name: true }
        },
        _count: {
          select: { fields: true }
        }
      }
    });

    return NextResponse.json(forms);
  } catch (error: any) {
    console.error("GET /api/forms error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentOrganizationId = (session as any).currentOrganizationId;
    if (!currentOrganizationId) {
      return NextResponse.json({ error: "No organization context" }, { status: 400 });
    }

    const body = await req.json();
    const { name, description, companyId } = body;

    if (!name || !companyId) {
      return NextResponse.json({ error: "Name and Target Company are required" }, { status: 400 });
    }

    // Verify company belongs to organization
    const company = await prisma.company.findUnique({
       where: { id: companyId }
    });
    
    if (!company || company.organizationId !== currentOrganizationId) {
       return NextResponse.json({ error: "Invalid company" }, { status: 400 });
    }

    const form = await prisma.form.create({
      data: {
        name,
        description,
        organizationId: currentOrganizationId,
        companyId: companyId,
        isActive: true,
        successAction: "MESSAGE",
      },
    });

    return NextResponse.json(form, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/forms error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
