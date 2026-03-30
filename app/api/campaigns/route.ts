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

    const campaigns = await prisma.emailCampaign.findMany({
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
        project: {
          select: { name: true }
        },
        targetForm: {
          select: { name: true }
        },
        _count: {
          select: { logs: true }
        }
      }
    });

    return NextResponse.json(campaigns);
  } catch (error: any) {
    console.error("GET /api/campaigns error:", error);
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
    const { subject, body: htmlBody, companyId, projectId, targetFormId } = body;

    if (!subject || !htmlBody || !companyId) {
      return NextResponse.json({ error: "Subject, body, and company are required" }, { status: 400 });
    }

    // Verify company belongs to organization
    const company = await prisma.company.findUnique({
       where: { id: companyId }
    });
    if (!company || company.organizationId !== currentOrganizationId) {
       return NextResponse.json({ error: "Invalid company" }, { status: 400 });
    }

    const campaign = await prisma.emailCampaign.create({
      data: {
        subject,
        body: htmlBody,
        status: "DRAFT",
        organizationId: currentOrganizationId,
        companyId: companyId,
        projectId: projectId || null,
        targetFormId: targetFormId || null,
      },
    });

    return NextResponse.json(campaign, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/campaigns error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
