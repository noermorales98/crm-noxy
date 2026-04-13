import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getGoogleOAuthClient } from "@/src/lib/google-calendar";
import { prisma } from "@/src/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  const organizationId = (session as any)?.currentOrganizationId as string | undefined;

  if (!session?.user || !organizationId) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(new URL("/settings?error=google_denied", req.url));
  }

  try {
    const oauth2Client = getGoogleOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token) {
      return NextResponse.redirect(new URL("/settings?error=google_no_token", req.url));
    }

    await prisma.googleCalendarToken.upsert({
      where: { organizationId },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? undefined,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      },
      create: {
        organizationId,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? undefined,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      },
    });

    return NextResponse.redirect(new URL("/settings?google=connected", req.url));
  } catch (err) {
    console.error("[google-calendar] OAuth callback error:", err);
    return NextResponse.redirect(new URL("/settings?error=google_auth", req.url));
  }
}
