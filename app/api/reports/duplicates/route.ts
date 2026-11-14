import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";
import { findDuplicateContacts, findDuplicateForms } from "@/src/lib/duplicates";

// Solo lectura: propone grupos de duplicados. No borra ni fusiona nada.
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const organizationId = (session as any).currentOrganizationId;
    if (!organizationId) return NextResponse.json({ error: "No organization context" }, { status: 400 });

    const [contacts, forms] = await Promise.all([
      prisma.contact.findMany({
        where: { organizationId },
        select: { id: true, firstName: true, lastName: true, email: true, phone: true, createdAt: true, sourceFormId: true },
      }),
      prisma.form.findMany({
        where: { organizationId },
        select: { id: true, name: true, companyId: true, isActive: true, createdAt: true, _count: { select: { contacts: true } } },
      }),
    ]);

    return NextResponse.json({
      contacts: findDuplicateContacts(contacts),
      forms: findDuplicateForms(forms.map((f) => ({ ...f, submissions: f._count.contacts }))),
      note: "Solo propuesta: nada se borra ni se fusiona sin tu confirmación.",
    });
  } catch (error) {
    console.error("GET /api/reports/duplicates error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
