import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { auth } from "@/auth";

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    const organizationId = (session as any).currentOrganizationId;
    if (!organizationId) return NextResponse.json({ error: "Context required" }, { status: 400 });

    const { id } = await context.params;

    const record = await prisma.blockedTime.findFirst({
      where: { id, organizationId }
    });

    if (!record) {
      return NextResponse.json({ error: "Not found or unauthorized" }, { status: 404 });
    }

    await prisma.blockedTime.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE BlockedTime Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
