import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";

type Params = { params: Promise<{ id: string; activityId: string }> };

export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth();
  const orgId = (session as any)?.currentOrganizationId as string | undefined;
  if (!session?.user || !orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, activityId } = await params;

  const activity = await prisma.projectActivity.findFirst({
    where: { id: activityId, projectId: id, organizationId: orgId },
  });
  if (!activity) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (activity.type !== "NOTE") {
    return NextResponse.json({ error: "Solo se pueden borrar notas" }, { status: 400 });
  }

  await prisma.projectActivity.delete({ where: { id: activityId } });
  return new NextResponse(null, { status: 204 });
}
