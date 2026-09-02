import { NextResponse } from "next/server";
import { getPublicProjectByToken, getPublicProjectSubmissions } from "@/src/lib/project-public";

export async function GET(req: Request, context: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await context.params;
    const project = await getPublicProjectByToken(token);
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const formId = new URL(req.url).searchParams.get("formId");
    const data = await getPublicProjectSubmissions({
      projectId: project.id,
      organizationId: project.organizationId,
      formId,
    });
    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/public/projects/[token]/submissions error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
