import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { auth } from "@/auth";

export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { phone, callMeBotApiKey, notificationEmail, timezone } = body;

    if (!session.user.id) {
       return NextResponse.json({ error: "User ID not found" }, { status: 401 });
    }

    const upsertedConfig = await prisma.callMeBot.upsert({
      where: { userId: session.user.id },
      update: {
        phone: phone || "",
        apiKey: callMeBotApiKey || "",
        notificationEmail: notificationEmail || null,
      },
      create: {
        userId: session.user.id,
        phone: phone || "",
        apiKey: callMeBotApiKey || "",
        notificationEmail: notificationEmail || null,
      }
    });

    // Update org timezone if provided
    const organizationId = (session as any).currentOrganizationId;
    if (organizationId) {
      const orgData: any = {};
      if (timezone) orgData.timezone = timezone;
      if (body.autoArchiveDays !== undefined) orgData.autoArchiveDays = body.autoArchiveDays;
      
      if (Object.keys(orgData).length > 0) {
        await prisma.organization.update({
          where: { id: organizationId },
          data: orgData,
        });
      }
    }

    return NextResponse.json(
      { message: "Settings updated successfully", user: { phone: upsertedConfig.phone, callMeBotApiKey: upsertedConfig.apiKey, notificationEmail: upsertedConfig.notificationEmail } },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("PATCH /api/settings error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
     const session = await auth();
     if (!session?.user?.id) {
       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
     }

     const config = await prisma.callMeBot.findUnique({
       where: { userId: session.user.id }
     });

     const organizationId = (session as any).currentOrganizationId;
     let timezone = "America/Cancun";
     let autoArchiveDays = 30;
     if (organizationId) {
       const org = await prisma.organization.findUnique({
         where: { id: organizationId },
         select: { timezone: true, autoArchiveDays: true },
       });
       timezone = org?.timezone || "America/Cancun";
       if (org?.autoArchiveDays !== undefined) autoArchiveDays = org.autoArchiveDays;
     }

     return NextResponse.json({
        phone: config?.phone || "",
        callMeBotApiKey: config?.apiKey || "",
        notificationEmail: config?.notificationEmail || "",
        timezone,
        autoArchiveDays,
     }, { status: 200 });
   } catch (error: any) {
     console.error("GET /api/settings error:", error);
     return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
   }
}
