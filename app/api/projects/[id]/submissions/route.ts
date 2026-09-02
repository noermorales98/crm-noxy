import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";
import { getProjectSubmissions } from "@/src/lib/project-submissions";

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    const currentOrganizationId = (session as any)?.currentOrganizationId as string | undefined;
    if (!session?.user || !currentOrganizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const project = await prisma.project.findFirst({
      where: { id, organizationId: currentOrganizationId },
      select: { id: true },
    });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const formId = new URL(req.url).searchParams.get("formId");
    const data = await getProjectSubmissions({
      projectId: id,
      organizationId: currentOrganizationId,
      formId,
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/projects/[id]/submissions error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
