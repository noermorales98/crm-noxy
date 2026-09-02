import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { processCampaignEmails } from "@/src/lib/process-campaign-emails";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const hasCronSecret = authHeader === `Bearer ${process.env.CRON_SECRET}`;

  let organizationId: string | undefined;

  if (!hasCronSecret) {
    const session = await auth();
    if (session?.user?.id) {
      organizationId = (session as any).currentOrganizationId as string | undefined;
      if (!organizationId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    } else if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const result = await processCampaignEmails({ organizationId });

    if (result.processed === 0) {
      return NextResponse.json({
        message: "No pending emails to process",
        processed: 0,
        successful: 0,
        failed: 0,
        pending: result.pending,
      });
    }

    return NextResponse.json({
      message: "Batch processed",
      ...result,
    });
  } catch (error) {
    console.error("Cron / process-emails error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
