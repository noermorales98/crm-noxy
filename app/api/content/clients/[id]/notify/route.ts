import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";
import { sendWhatsAppNotification } from "@/src/lib/whatsapp";

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

export function buildRecordingMessage(clientName: string, item: {
  date: Date; type: string; title: string; hook?: string | null; script?: string | null; tips?: string | null;
}): string {
  const d = item.date;
  const fecha = `${DIAS[d.getUTCDay()]} ${d.getUTCDate()} de ${MESES[d.getUTCMonth()]}`;
  const esEntrega = item.type === "entrega";
  let msg = `🎬 *${clientName}* — Recordatorio de contenido\n\n`;
  msg += esEntrega
    ? `📅 El *${fecha}* toca GRABAR: *${item.title}*\n`
    : `📅 El *${fecha}* tienes: *${item.title}*\n`;
  if (item.hook) msg += `\n💡 Hook (primeros 3 seg):\n"${item.hook}"`;
  if (item.script) msg += `\n\n📝 Qué decir:\n${item.script}`;
  if (item.tips) msg += `\n\n✅ Sugerencias para grabar:\n${item.tips}`;
  if (esEntrega) msg += `\n\nCuando lo tengas, envía el video crudo sin editar. 🙌`;
  return msg;
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const orgId = (session as any).currentOrganizationId as string | undefined;
  if (!orgId) return NextResponse.json({ error: "Sin organización" }, { status: 400 });

  const { id } = await params;
  const client = await prisma.contentClient.findFirst({
    where: { id, organizationId: orgId },
    include: { phones: true },
  });
  if (!client) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  if (client.phones.length === 0) {
    return NextResponse.json({ error: "Este cliente no tiene números de WhatsApp (CallMeBot) configurados" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const itemId = typeof body?.itemId === "string" ? body.itemId : null;
  if (!itemId) return NextResponse.json({ error: "Falta itemId" }, { status: 400 });

  const item = await prisma.contentItem.findFirst({ where: { id: itemId, clientId: id, organizationId: orgId } });
  if (!item) return NextResponse.json({ error: "Pieza no encontrada" }, { status: 404 });

  const customMessage = typeof body?.message === "string" && body.message.trim() ? body.message.trim() : null;
  const message = customMessage ?? buildRecordingMessage(client.name, item);

  const results: { phone: string; ok: boolean }[] = [];
  for (const p of client.phones) {
    const ok = await sendWhatsAppNotification(p.phone, p.apiKey, message);
    results.push({ phone: p.phone, ok });
  }

  if (results.some((r) => r.ok)) {
    await prisma.contentItem.update({ where: { id: item.id }, data: { notifiedAt: new Date() } });
  }

  const sent = results.filter((r) => r.ok).length;
  return NextResponse.json({
    sent,
    failed: results.length - sent,
    results,
    message,
  });
}
