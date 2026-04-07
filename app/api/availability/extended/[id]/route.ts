import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { auth } from "@/auth";

export async function DELETE(_req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const organizationId = (session as any).currentOrganizationId;
    if (!organizationId) return NextResponse.json({ error: "Context required" }, { status: 400 });

    const { id } = await context.params;

    await prisma.extendedAvailability.deleteMany({
      where: { id, organizationId },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    console.error("DELETE ExtendedAvailability Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
