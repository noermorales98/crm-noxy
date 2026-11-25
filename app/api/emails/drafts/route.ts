import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { auth } from "@/auth";
import { normalizeDraft } from "@/src/lib/email-drafts";

// Crea un borrador. No envía nada: queda en /emails → Borradores para que la persona lo revise.
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const organizationId = session.currentOrganizationId;
    if (!organizationId) return NextResponse.json({ error: "No organization context" }, { status: 400 });

    const body = await req.json().catch(() => null);
    const companyId = typeof body?.companyId === "string" ? body.companyId : "";
    if (!companyId) return NextResponse.json({ error: "companyId es obligatorio" }, { status: 400 });
    const draft = normalizeDraft(body);
    if (!draft.ok) return NextResponse.json({ error: draft.error }, { status: 400 });

    const company = await prisma.company.findFirst({
      where: { id: companyId, organizationId },
      select: { id: true, name: true, smtpFromEmail: true, smtpUser: true },
    });
    if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

    const email = await prisma.email.create({
      data: {
        ...draft.data,
        type: "DRAFT",
        isRead: true,
        fromAddress: company.smtpFromEmail || company.smtpUser || "",
        fromName: company.name,
        companyId: company.id,
        organizationId,
      },
      select: { id: true, subject: true, toAddress: true, companyId: true },
    });
    return NextResponse.json({ email }, { status: 201 });
  } catch (error) {
    console.error("POST /api/emails/drafts error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
