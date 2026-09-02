import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { auth } from "@/auth";

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string; recipientId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const organizationId = (session as any).currentOrganizationId as string | undefined;
    if (!organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: formId, recipientId } = await context.params;
    const recipient = await prisma.formWhatsAppRecipient.findFirst({
      where: { id: recipientId, formId, form: { organizationId } },
    });
    if (!recipient) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.formWhatsAppRecipient.delete({ where: { id: recipientId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/forms/[id]/whatsapp-recipients/[recipientId] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
