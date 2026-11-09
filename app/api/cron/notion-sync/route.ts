import { NextResponse } from "next/server";
import { syncPendingDocs } from "@/src/lib/notion-sync";

// GET /api/cron/notion-sync
// Respaldo del auto-sync de documentos del /kb: envía a Notion los editados desde su último envío.
// Frecuencia sugerida en cron-job.org: cada 5 minutos.
export async function GET(req: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ message: "Documentos pendientes enviados a Notion", ...(await syncPendingDocs()) });
  } catch (error) {
    console.error("GET /api/cron/notion-sync error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
