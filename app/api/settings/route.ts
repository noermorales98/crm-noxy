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
    const { phone, callMeBotApiKey, notificationEmail } = body;

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
 
     return NextResponse.json({
        phone: config?.phone || "",
        callMeBotApiKey: config?.apiKey || "",
        notificationEmail: config?.notificationEmail || "",
     }, { status: 200 });
   } catch (error: any) {
     console.error("GET /api/settings error:", error);
     return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
   }
}
