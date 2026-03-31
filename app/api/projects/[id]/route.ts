import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    const currentOrganizationId = (session as any)?.currentOrganizationId;

    if (!session?.user || !currentOrganizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    const project = await prisma.project.findFirst({
      where: { id, organizationId: currentOrganizationId },
      include: {
        contacts: { select: { id: true } },
        companies: { select: { id: true } },
        forms: { select: { id: true } },
        campaigns: { select: { id: true } },
        tasks: { select: { id: true } },
      }
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json({
      contactIds: project.contacts.map((c: any) => c.id),
      companyIds: project.companies.map((c: any) => c.id),
      formIds: project.forms.map((f: any) => f.id),
      campaignIds: project.campaigns.map((c: any) => c.id),
      taskIds: project.tasks.map((t: any) => t.id),
    });
  } catch (error: any) {
    console.error("GET /api/projects/[id] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    const currentOrganizationId = (session as any)?.currentOrganizationId;

    if (!session?.user || !currentOrganizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    const project = await prisma.project.findFirst({
      where: { id, organizationId: currentOrganizationId }
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found or unauthorized" }, { status: 404 });
    }

    await prisma.project.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/projects/[id] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    const currentOrganizationId = (session as any)?.currentOrganizationId;

    if (!session?.user || !currentOrganizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    const project = await prisma.project.findFirst({
      where: { id, organizationId: currentOrganizationId }
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found or unauthorized" }, { status: 404 });
    }

    const payload = await req.json();
    const { resourceType, resourceIds } = payload;

    if (!resourceType || !Array.isArray(resourceIds)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // Use updateMany for reliable one-to-many linking with org isolation
    if (resourceType === "contacts") {
      // Unlink all previously linked contacts for this project
      await prisma.contact.updateMany({
        where: { projectId: id, organizationId: currentOrganizationId },
        data: { projectId: null }
      });
      // Link the selected ones (only within this org)
      if (resourceIds.length > 0) {
        await prisma.contact.updateMany({
          where: { id: { in: resourceIds }, organizationId: currentOrganizationId },
          data: { projectId: id }
        });
      }
    } else if (resourceType === "companies") {
      await prisma.company.updateMany({
        where: { projectId: id, organizationId: currentOrganizationId },
        data: { projectId: null }
      });
      if (resourceIds.length > 0) {
        await prisma.company.updateMany({
          where: { id: { in: resourceIds }, organizationId: currentOrganizationId },
          data: { projectId: id }
        });
      }
    } else if (resourceType === "forms") {
      await prisma.form.updateMany({
        where: { projectId: id, organizationId: currentOrganizationId },
        data: { projectId: null }
      });
      if (resourceIds.length > 0) {
        await prisma.form.updateMany({
          where: { id: { in: resourceIds }, organizationId: currentOrganizationId },
          data: { projectId: id }
        });
      }
    } else if (resourceType === "campaigns") {
      await prisma.emailCampaign.updateMany({
        where: { projectId: id, organizationId: currentOrganizationId },
        data: { projectId: null }
      });
      if (resourceIds.length > 0) {
        await prisma.emailCampaign.updateMany({
          where: { id: { in: resourceIds }, organizationId: currentOrganizationId },
          data: { projectId: id }
        });
      }
    } else if (resourceType === "tasks") {
      await prisma.task.updateMany({
        where: { projectId: id, organizationId: currentOrganizationId },
        data: { projectId: null }
      });
      if (resourceIds.length > 0) {
        await prisma.task.updateMany({
          where: { id: { in: resourceIds }, organizationId: currentOrganizationId },
          data: { projectId: id }
        });
      }
    } else {
      return NextResponse.json({ error: "Invalid resourceType" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("PUT /api/projects/[id] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
