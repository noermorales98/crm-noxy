import { NextResponse } from "next/server";
import { getPublicProjectByToken, getProjectLinkedDocs } from "@/src/lib/project-public";

export async function GET(_req: Request, context: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await context.params;
    const project = await getPublicProjectByToken(token);
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const relations = await getProjectLinkedDocs(project.id);
    return NextResponse.json(relations.map((r) => ({ id: r.id, page: r.page })));
  } catch (error) {
    console.error("GET /api/public/projects/[token]/docs error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
