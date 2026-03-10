import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { auth } from "@/auth";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentOrganizationId = (session as any).currentOrganizationId;
    if (!currentOrganizationId) {
      return NextResponse.json({ error: "No organization context" }, { status: 400 });
    }

    const companies = await prisma.company.findMany({
      where: {
        organizationId: currentOrganizationId,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        _count: {
          select: { contacts: true },
        },
      },
    });

    return NextResponse.json(companies);
  } catch (error: any) {
    console.error("GET /api/companies error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentOrganizationId = (session as any).currentOrganizationId;
    if (!currentOrganizationId) {
      return NextResponse.json({ error: "No organization context" }, { status: 400 });
    }

    const body = await req.json();
    const { name, website, industry } = body;

    if (!name) {
      return NextResponse.json({ error: "Company name is required" }, { status: 400 });
    }

    const company = await prisma.company.create({
      data: {
        name,
        website,
        industry,
        organizationId: currentOrganizationId,
      },
    });

    return NextResponse.json(company, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/companies error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentOrganizationId = (session as any).currentOrganizationId;
    if (!currentOrganizationId) {
      return NextResponse.json({ error: "No organization context" }, { status: 400 });
    }

    const body = await req.json();
    const { id, name, website, industry } = body;

    if (!id || !name) {
      return NextResponse.json({ error: "Company ID and name are required" }, { status: 400 });
    }

    // Verify company belongs to the user's current organization
    const existingCompany = await prisma.company.findUnique({
      where: { id },
    });

    if (!existingCompany || existingCompany.organizationId !== currentOrganizationId) {
      return NextResponse.json({ error: "Company not found or unauthorized" }, { status: 404 });
    }

    const company = await prisma.company.update({
      where: { id },
      data: {
        name,
        website,
        industry,
      },
      include: {
        _count: {
          select: { contacts: true },
        },
      },
    });

    return NextResponse.json(company);
  } catch (error: any) {
    console.error("PUT /api/companies error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
