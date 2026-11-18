import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { allowRequest, buildFormSubmission, DEMO_FORM_NAME, parseDemoRequest } from "@/src/lib/demo-request";
import { POST as submitForm } from "@/app/api/public/forms/[id]/submit/route";

export const maxDuration = 30;

// Límite sencillo por dirección (en memoria): frena el envío masivo desde una misma IP.
const hits = new Map<string, number[]>();

/**
 * Solicitud de demo de la landing pública. Se valida, se limpia y se envía por el MISMO flujo que cualquier formulario
 * del CRM («Demo de Noxy CRM»): contacto, lead en el pipeline, tarea, seguimientos y aviso al dueño. Nunca devuelve datos.
 */
export async function POST(req: Request) {
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "desconocida";
  if (!allowRequest(hits, ip, Date.now())) {
    return NextResponse.json({ error: "Recibimos varias solicitudes seguidas. Inténtalo de nuevo en un rato." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = parseDemoRequest(body);
  if (parsed.ok === "bot") return NextResponse.json({ ok: true }); // el robot cree que funcionó; no se crea nada
  if (parsed.ok === false) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const form = await prisma.form.findFirst({
    where: { name: DEMO_FORM_NAME, isActive: true },
    select: { id: true, fields: { orderBy: { order: "asc" }, select: { type: true, name: true, label: true } } },
  });
  if (!form) {
    console.warn(`[demo] no existe un formulario activo llamado «${DEMO_FORM_NAME}»`);
    return NextResponse.json({ error: "La solicitud de demo no está disponible por ahora. Inténtalo más tarde." }, { status: 503 });
  }

  const data = buildFormSubmission(form.fields, parsed.value);
  const res = await submitForm(
    new Request(req.url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }),
    { params: Promise.resolve({ id: form.id }) },
  );
  if (!res.ok) {
    console.error("[demo] el formulario respondió", res.status);
    return NextResponse.json({ error: "No pudimos registrar tu solicitud. Inténtalo de nuevo." }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
