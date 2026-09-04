import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";
import { generateFormApiToken } from "@/src/lib/form-entries-api";

export async function POST(_req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentOrganizationId = (session as { currentOrganizationId?: string }).currentOrganizationId;
    if (!currentOrganizationId) {
      return NextResponse.json({ error: "No organization context" }, { status: 400 });
    }

    const form = await prisma.form.findUnique({ where: { id } });
    if (!form || form.organizationId !== currentOrganizationId) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    const apiToken = generateFormApiToken();
    await prisma.form.update({
      where: { id },
      data: { apiToken, apiAuthRequired: true },
    });

    return NextResponse.json({ apiToken });
  } catch (error) {
    console.error("POST /api/forms/[id]/api-token error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
