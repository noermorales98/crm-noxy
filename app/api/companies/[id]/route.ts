import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    const currentOrganizationId = (session as any)?.currentOrganizationId;
    
    if (!session?.user || !currentOrganizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    const company = await prisma.company.findFirst({
      where: { id, organizationId: currentOrganizationId }
    });

    if (!company) {
      return NextResponse.json({ error: "Company not found or unauthorized" }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.email.deleteMany({ where: { companyId: id } }),
      prisma.company.delete({ where: { id } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/companies/[id] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
