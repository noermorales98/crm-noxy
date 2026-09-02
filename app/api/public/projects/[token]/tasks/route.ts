import { NextResponse } from "next/server";
import { getPublicProjectByToken, getPublicProjectTasks } from "@/src/lib/project-public";

export async function GET(_req: Request, context: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await context.params;
    const project = await getPublicProjectByToken(token);
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const tasks = await getPublicProjectTasks(project.id);
    return NextResponse.json(tasks);
  } catch (error) {
    console.error("GET /api/public/projects/[token]/tasks error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
