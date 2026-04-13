import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getGoogleAuthUrl } from "@/src/lib/google-calendar";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.json(
      { error: "Google Calendar API not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your environment." },
      { status: 503 }
    );
  }

  const url = getGoogleAuthUrl();
  return NextResponse.json({ url });
}
