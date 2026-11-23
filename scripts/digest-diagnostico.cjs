// Solo lectura: cuántos resúmenes diarios hay, cuáles están activos y si el usuario tiene WhatsApp.
// Uso: node scripts/digest-diagnostico.cjs   (usa DATABASE_URL del .env; no imprime credenciales)
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

(async () => {
  const schedules = await prisma.digestSchedule.findMany({
    include: { user: { select: { id: true, callMeBot: { select: { phone: true, apiKey: true } } } }, organization: { select: { name: true, timezone: true } } },
  });
  console.log(`DigestSchedule totales: ${schedules.length} | activos: ${schedules.filter((s) => s.enabled).length}`);
  for (const s of schedules) {
    const whatsapp = !!(s.user.callMeBot?.phone && s.user.callMeBot?.apiKey);
    console.log(
      `- org "${s.organization.name}" (${s.organization.timezone}) | ${s.enabled ? "ACTIVO" : "apagado"} | ${s.frequency} ${String(s.hour).padStart(2, "0")}:${String(s.minute).padStart(2, "0")} | WhatsApp ${whatsapp ? "configurado" : "FALTA"} | último envío: ${s.lastSentAt ? s.lastSentAt.toISOString() : "nunca"}`,
    );
  }
  const users = await prisma.user.count();
  const withoutSchedule = await prisma.user.count({ where: { digestSchedules: { none: {} } } }).catch(() => null);
  console.log(`Usuarios: ${users}${withoutSchedule === null ? "" : ` | sin resumen configurado: ${withoutSchedule}`}`);
  await prisma.$disconnect();
})().catch((e) => { console.error(e.message); process.exit(1); });
