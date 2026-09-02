import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";
import { randomBytes } from "crypto";
import { getPublicBaseUrl } from "@/src/lib/url";

function newShareToken() {
  return randomBytes(16).toString("hex");
}

function sharePayload(project: { publicToken: string | null; isPublic: boolean }) {
  const token = project.publicToken;
  let url = "";
  if (token && project.isPublic) {
    try {
      url = `${getPublicBaseUrl()}/proyecto/${token}`;
    } catch {
      url = "";
    }
  }
  return {
    isPublic: project.isPublic,
    publicToken: token,
    url,
  };
}

async function getOwnedProject(id: string, organizationId: string) {
  return prisma.project.findFirst({
    where: { id, organizationId },
    select: { id: true, publicToken: true, isPublic: true },
  });
}

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    const organizationId = (session as any)?.currentOrganizationId as string | undefined;
    if (!session?.user || !organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const project = await getOwnedProject(id, organizationId);
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    return NextResponse.json(sharePayload(project));
  } catch (error) {
    console.error("GET /api/projects/[id]/share error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    const organizationId = (session as any)?.currentOrganizationId as string | undefined;
    if (!session?.user || !organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const project = await getOwnedProject(id, organizationId);
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const data: { isPublic?: boolean; publicToken?: string } = {};

    if (typeof body.isPublic === "boolean") {
      data.isPublic = body.isPublic;
      if (body.isPublic && !project.publicToken) {
        data.publicToken = newShareToken();
      }
    }

    if (body.regenerateToken === true) {
      data.publicToken = newShareToken();
    }

    const updated = await prisma.project.update({
      where: { id },
      data,
      select: { publicToken: true, isPublic: true },
    });

    return NextResponse.json(sharePayload(updated));
  } catch (error) {
    console.error("PATCH /api/projects/[id]/share error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  return PATCH(req, context);
}
