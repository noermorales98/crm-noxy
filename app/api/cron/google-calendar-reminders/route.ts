import { NextResponse } from "next/server";
import { runGoogleCalendarReminders } from "@/src/lib/google-calendar-reminders";

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await runGoogleCalendarReminders();
    return NextResponse.json({
      message: "Recordatorios de Google Calendar procesados",
      ...result,
    });
  } catch (err) {
    console.error("[google-calendar-reminders]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
