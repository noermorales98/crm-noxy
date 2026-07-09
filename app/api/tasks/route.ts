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
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    const tasks = await prisma.task.findMany({
      where: {
        organizationId: currentOrganizationId,
        ...(projectId ? { projectId } : {}),
      },
      include: {
        assignedTo: { select: { name: true, email: true } },
        deal: { select: { title: true } },
        contact: { select: { firstName: true, lastName: true } },
        project: { select: { id: true, name: true, icon: true } },
        company: { select: { id: true, name: true } },
        form: { select: { id: true, name: true } },
        appointment: { select: { id: true, startTime: true, guestName: true, appointmentType: { select: { name: true } } } },
      },
      orderBy: [
        { isCompleted: "asc" },
        { dueDate: "asc" },
      ],
    });

    return NextResponse.json(tasks);
  } catch (error: any) {
    console.error("GET /api/tasks error:", error);
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

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await req.json();
    const { title, description, dueDate, dealId, contactId, projectId, companyId, formId, appointmentId } = body;

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const task = await prisma.task.create({
      data: {
        title,
        description,
        dueDate: dueDate ? new Date(dueDate) : null,
        dealId: dealId || null,
        contactId: contactId || null,
        projectId: projectId || null,
        companyId: companyId || null,
        formId: formId || null,
        appointmentId: appointmentId || null,
        organizationId: currentOrganizationId,
        assignedToId: user.id
      },
      include: {
        assignedTo: { select: { name: true, email: true } },
      }
    });

    if (task.projectId) {
      await prisma.projectActivity.create({
        data: {
          type: "TASK_CREATED",
          description: `Tarea creada: ${task.title}`,
          projectId: task.projectId,
          organizationId: currentOrganizationId,
          createdById: user.id,
        },
      });
    }

    return NextResponse.json(task, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/tasks error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    const currentOrganizationId = (session as any).currentOrganizationId;
    
    const body = await req.json();
    const { id, isCompleted } = body;

    if (!id || isCompleted === undefined) {
      return NextResponse.json({ error: "Task ID and isCompleted status are required" }, { status: 400 });
    }

    const existingTask = await prisma.task.findUnique({ where: { id } });
    
    if (!existingTask || existingTask.organizationId !== currentOrganizationId) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const updatedTask = await prisma.task.update({
      where: { id },
      data: { isCompleted }
    });

    if (isCompleted && !existingTask.isCompleted && existingTask.projectId) {
      await prisma.projectActivity.create({
        data: {
          type: "TASK_COMPLETED",
          description: `Tarea completada: ${existingTask.title}`,
          projectId: existingTask.projectId,
          organizationId: currentOrganizationId,
          createdById: (session as any).user.id,
        },
      });
    }

    return NextResponse.json(updatedTask);
  } catch (error: any) {
    console.error("PATCH /api/tasks error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
