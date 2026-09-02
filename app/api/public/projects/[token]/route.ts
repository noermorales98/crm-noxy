import { NextResponse } from "next/server";
import { getPublicProjectMeta } from "@/src/lib/project-public";

export async function GET(_req: Request, context: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await context.params;
    const meta = await getPublicProjectMeta(token);
    if (!meta) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(meta);
  } catch (error) {
    console.error("GET /api/public/projects/[token] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
