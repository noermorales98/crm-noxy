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
        tasks: { select: { id: true } },
      }
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json({
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
    const { resourceType, resourceIds, fields } = payload;

    // Direct update of the project's own scalar association fields
    // (name/description/icon/companyId/contactId/clientId/emailAccountCompanyId).
    if (fields && typeof fields === "object") {
      const allowedKeys = ["name", "description", "icon", "companyId", "contactId", "clientId", "emailAccountCompanyId"] as const;
      const data: Record<string, string | null> = {};
      for (const key of allowedKeys) {
        if (key in fields) data[key] = fields[key] || null;
      }
      await prisma.project.update({ where: { id }, data });

      const associationLabels: Record<string, string> = {
        companyId: "Empresa asociada",
        contactId: "Contacto asociado",
        clientId: "Cliente recurrente",
        emailAccountCompanyId: "Cuenta de correo",
      };
      const changes: string[] = [];
      for (const key of Object.keys(associationLabels)) {
        if (key in data && data[key] !== (project as any)[key]) {
          if (!data[key]) {
            changes.push(`${associationLabels[key]} quitado`);
          } else if (key === "contactId") {
            const c = await prisma.contact.findUnique({ where: { id: data[key]! }, select: { firstName: true, lastName: true } });
            changes.push(`${associationLabels[key]}: ${c ? `${c.firstName} ${c.lastName ?? ""}`.trim() : "—"}`);
          } else {
            const model = key === "clientId" ? prisma.client : prisma.company;
            const e = await (model as any).findUnique({ where: { id: data[key]! }, select: { name: true } });
            changes.push(`${associationLabels[key]}: ${e?.name ?? "—"}`);
          }
        }
      }
      if (changes.length > 0) {
        await prisma.projectActivity.create({
          data: {
            type: "ASSOCIATIONS_UPDATED",
            description: changes.join(" · "),
            projectId: id,
            organizationId: currentOrganizationId,
            createdById: session.user.id,
          },
        });
      }

      return NextResponse.json({ success: true });
    }

    if (!resourceType || !Array.isArray(resourceIds)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // Only tasks are linked/unlinked from the project side; forms and campaigns
    // keep their own independent "Asignar a proyecto" pickers in /forms and /campaigns.
    if (resourceType === "tasks") {
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
