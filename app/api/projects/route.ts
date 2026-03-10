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

    const url = new URL(req.url);
    const limitParam = url.searchParams.get("limit");
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;

    const projects = await prisma.project.findMany({
      where: {
        organizationId: currentOrganizationId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
      include: {
        _count: {
          select: {
            forms: true,
            campaigns: true,
            contacts: true,
            companies: true,
            tasks: true
          }
        }
      }
    });

    return NextResponse.json(projects);
  } catch (error: any) {
    console.error("GET /api/projects error:", error);
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
    const { name, description, icon, companyId } = body;

    if (!name) {
      return NextResponse.json({ error: "Project name is required" }, { status: 400 });
    }

    const project = await prisma.project.create({
      data: {
        name,
        description,
        icon,
        companyId: companyId || null,
        organizationId: currentOrganizationId,
      },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/projects error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
