import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { auth } from "@/auth";

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentOrganizationId = (session as any).currentOrganizationId;
    const { id: formId } = await context.params;

    // Verify form belongs to organization
    const form = await prisma.form.findUnique({
      where: { id: formId, organizationId: currentOrganizationId }
    });

    if (!form) {
      return NextResponse.json({ error: "Form not found or unauthorized" }, { status: 404 });
    }

    // Include the Contact fields along with their created tasks (notes) if needed
    const contacts = await prisma.contact.findMany({
      where: {
        sourceFormId: formId,
        organizationId: currentOrganizationId
      },
      orderBy: {
        createdAt: "desc"
      },
      include: {
        sourceVariant: { select: { id: true, name: true } },
        tasks: {
          take: 1,
          orderBy: { createdAt: "desc" },
          where: { formId: formId }
        }
      }
    });

    return NextResponse.json(contacts);
  } catch (error: any) {
    console.error("GET /api/forms/[id]/contacts error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
