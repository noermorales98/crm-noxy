import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { auth } from "@/auth";

/**
 * DELETE /api/emails/fix-corrupted
 *
 * Removes emails stored with corrupted address fields (undefined@undefined, etc.)
 * so they can be re-fetched cleanly via /api/cron/fetch-emails?reset=true
 */
export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentOrganizationId = (session as any).currentOrganizationId;
    if (!currentOrganizationId) {
      return NextResponse.json({ error: "No organization context" }, { status: 400 });
    }

    const { count } = await prisma.email.deleteMany({
      where: {
        organizationId: currentOrganizationId,
        OR: [
          { fromAddress: { contains: "undefined" } },
          { toAddress: { contains: "undefined" } },
        ],
      },
    });

    return NextResponse.json(
      { message: `Se eliminaron ${count} correos corruptos. Ahora ejecuta una sincronización.`, count },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("DELETE /api/emails/fix-corrupted error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
