import { NextResponse } from "next/server";
import { getPublicProjectByToken, getPublicProjectPage } from "@/src/lib/project-public";

export async function GET(_req: Request, context: { params: Promise<{ token: string; pageId: string }> }) {
  try {
    const { token, pageId } = await context.params;
    const project = await getPublicProjectByToken(token);
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const page = await getPublicProjectPage({
      projectId: project.id,
      organizationId: project.organizationId,
      pageId,
    });
    if (!page) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({
      id: page.id,
      title: page.title,
      content: page.content ?? "",
      isFolder: page.isFolder,
      markdownTheme: page.markdownTheme,
      emoji: page.emoji,
      iconColor: page.iconColor,
      iconBg: page.iconBg,
      updatedAt: page.updatedAt.toISOString(),
      children: page.children,
    });
  } catch (error) {
    console.error("GET /api/public/projects/[token]/docs/[pageId] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
