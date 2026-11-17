import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { granolaScope } from "@/src/lib/granola-auth";
import { buildTaskData } from "@/src/lib/granola-rules";

class AlreadyConverted extends Error {}

/** Convierte un paso en tarea del CRM ligada al lead/contacto de la cita. Una sola vez por paso. */
export async function POST(_req: Request, context: { params: Promise<{ id: string }> }) {
  const access = await granolaScope();
  if ("error" in access) return access.error;
  const { organizationId, userId } = access.scope;
  const { id } = await context.params;

  try {
    const task = await prisma.$transaction(async (tx) => {
      const item = await tx.granolaActionItem.findFirst({
        where: { id, note: { organizationId } },
        include: { note: { select: { title: true, url: true, appointment: { select: { contactId: true, dealId: true } } } } },
      });
      if (!item) return null;
      if (item.taskId) throw new AlreadyConverted();

      const created = await tx.task.create({
        data: { organizationId, assignedToId: userId, ...buildTaskData(item, item.note) },
        select: { id: true, title: true },
      });
      // Si otra petición convirtió el mismo paso a la vez, esta no actualiza nada y la transacción se revierte.
      const linked = await tx.granolaActionItem.updateMany({ where: { id, taskId: null }, data: { taskId: created.id, convertedAt: new Date() } });
      if (linked.count !== 1) throw new AlreadyConverted();
      return created;
    });
    if (!task) return NextResponse.json({ error: "Paso no encontrado" }, { status: 404 });
    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    if (error instanceof AlreadyConverted) return NextResponse.json({ error: "Este paso ya se convirtió en tarea." }, { status: 409 });
    throw error;
  }
}
