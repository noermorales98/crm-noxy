import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";

export async function DELETE() {
  const session = await auth();
  const organizationId = (session as any)?.currentOrganizationId as string | undefined;

  if (!session?.user || !organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.googleCalendarToken.deleteMany({
    where: { organizationId },
  });

  return NextResponse.json({ success: true });
}
