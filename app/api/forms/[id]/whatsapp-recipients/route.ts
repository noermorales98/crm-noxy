import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { auth } from "@/auth";

async function getOwnedForm(formId: string, organizationId: string) {
  return prisma.form.findFirst({
    where: { id: formId, organizationId },
    select: { id: true },
  });
}

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const organizationId = (session as any).currentOrganizationId as string | undefined;
    if (!organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: formId } = await context.params;
    const form = await getOwnedForm(formId, organizationId);
    if (!form) return NextResponse.json({ error: "Form not found" }, { status: 404 });

    const recipients = await prisma.formWhatsAppRecipient.findMany({
      where: { formId },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(recipients);
  } catch (error) {
    console.error("GET /api/forms/[id]/whatsapp-recipients error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const organizationId = (session as any).currentOrganizationId as string | undefined;
    if (!organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: formId } = await context.params;
    const form = await getOwnedForm(formId, organizationId);
    if (!form) return NextResponse.json({ error: "Form not found" }, { status: 404 });

    const body = await req.json().catch(() => null);
    const phone = typeof body?.phone === "string" ? body.phone.replace(/[^\d+]/g, "") : "";
    const apiKey = typeof body?.apiKey === "string" ? body.apiKey.trim() : "";
    if (!phone || !apiKey) {
      return NextResponse.json({ error: "Número y API key son obligatorios" }, { status: 400 });
    }

    const entry = await prisma.formWhatsAppRecipient.create({
      data: {
        formId,
        phone,
        apiKey,
        label: typeof body?.label === "string" && body.label.trim() ? body.label.trim() : null,
      },
    });
    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error("POST /api/forms/[id]/whatsapp-recipients error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
