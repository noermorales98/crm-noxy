import { NextResponse } from "next/server";
import { runContentReminders } from "@/src/lib/content-reminders";

// GET /api/cron/content-reminders
// Recorre piezas con reminderEnabled=true cuyo día de aviso
// (date − reminderDaysBefore) es hoy, y envía WhatsApp vía CallMeBot
// en la ventana horaria configurada por cliente (reminderHour/Minute).
// Frecuencia sugerida en cron-job.org: cada 15 minutos.
export async function GET(req: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.get("authorization");
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await runContentReminders();

    return NextResponse.json({
      message: "Recordatorios de contenido procesados",
      ...result,
    });
  } catch (error) {
    console.error("GET /api/cron/content-reminders error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
