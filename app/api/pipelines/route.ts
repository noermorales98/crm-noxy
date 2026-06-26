import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { auth } from "@/auth";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentOrganizationId = (session as any).currentOrganizationId;
    if (!currentOrganizationId) {
      return NextResponse.json({ error: "No organization context" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const slim = searchParams.get("slim") === "true";

    const pipelines = await prisma.pipeline.findMany({
      where: { organizationId: currentOrganizationId },
      orderBy: { createdAt: "asc" },
      include: {
        stages: {
          orderBy: { order: "asc" },
          ...(slim
            ? { select: { id: true, name: true, order: true } }
            : {
                include: {
                  deals: {
                    orderBy: { createdAt: "desc" },
                    include: {
                      company: { select: { name: true } },
                      contact: { select: { firstName: true, lastName: true } },
                    },
                  },
                },
              }),
        },
      },
    });

    return NextResponse.json(pipelines);
  } catch (error: any) {
    console.error("GET /api/pipelines error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
