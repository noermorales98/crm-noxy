// Limpia los payment links de Stripe generados con redirect a localhost.
// Los links nuevos se regenerarán con la URL correcta al próximo intento de pago.
// Uso: node clear_stale_stripe_links.mjs
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const quotes = await prisma.quote.findMany({
  where: { stripePaymentLinkUrl: { not: null }, status: { not: "PAGADA" } },
  select: { id: true, folio: true, status: true, clientName: true },
});

const payments = await prisma.payment.findMany({
  where: { stripePaymentLinkUrl: { not: null }, status: { not: "RECIBIDO" } },
  select: { id: true, status: true, amount: true, dealId: true },
});

console.log(`Cotizaciones con link viejo (se limpiarán): ${quotes.length}`);
for (const q of quotes) console.log(`  - ${q.folio} [${q.status}] ${q.clientName}`);
console.log(`Pagos con link viejo (se limpiarán): ${payments.length}`);
for (const p of payments) console.log(`  - ${p.id} [${p.status}] $${p.amount} deal=${p.dealId}`);

const qRes = await prisma.quote.updateMany({
  where: { id: { in: quotes.map((q) => q.id) } },
  data: { stripePaymentLinkId: null, stripePaymentLinkUrl: null },
});
const pRes = await prisma.payment.updateMany({
  where: { id: { in: payments.map((p) => p.id) } },
  data: { stripePaymentLinkId: null, stripePaymentLinkUrl: null },
});

console.log(`Limpiados: ${qRes.count} cotizaciones, ${pRes.count} pagos.`);
await prisma.$disconnect();
