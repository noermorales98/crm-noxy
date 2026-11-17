import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { granolaRedirectUrl, runGranolaSync } from "@/src/lib/granola-service";

export const maxDuration = 60;

/** Sincroniza las organizaciones con Granola conectado. Mismo secreto que los demás crons. */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if ((!cronSecret && process.env.NODE_ENV === "production") || (cronSecret && authHeader !== `Bearer ${cronSecret}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const configs = await prisma.granolaConfig.findMany({ where: { status: { in: ["CONNECTED", "ERROR"] } }, select: { organizationId: true } });
  const redirectUrl = granolaRedirectUrl(req.url);
  let synced = 0;
  const errors: string[] = [];
  for (const { organizationId } of configs) {
    const result = await runGranolaSync(organizationId, redirectUrl);
    if (result.ok) synced += result.synced;
    else if (result.code !== "BUSY") errors.push(`${organizationId}: ${result.code}`);
  }
  return NextResponse.json({ organizations: configs.length, synced, errors });
}
