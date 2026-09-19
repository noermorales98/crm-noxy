import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";

export async function DELETE(_req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    const currentOrganizationId = (session as { currentOrganizationId?: string | null })?.currentOrganizationId;

    if (!session?.user || !currentOrganizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    const company = await prisma.company.findFirst({
      where: { id, organizationId: currentOrganizationId },
      select: { id: true },
    });

    if (!company) {
      return NextResponse.json({ error: "Company not found or unauthorized" }, { status: 404 });
    }

    const deleted = await prisma.$transaction(async (tx) => {
      const result = await tx.email.deleteMany({ where: { companyId: id } });
      await tx.company.update({
        where: { id },
        data: {
          smtpHost: null,
          smtpPort: null,
          smtpUser: null,
          smtpPass: null,
          smtpFromEmail: null,
          imapHost: null,
          imapPort: null,
          imapUser: null,
          imapPass: null,
          imapLastUid: 0,
          imapSpamLastUid: 0,
        },
      });
      return result.count;
    });

    return NextResponse.json({ success: true, deletedEmails: deleted });
  } catch (error) {
    console.error("DELETE /api/companies/[id]/mail-account error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
