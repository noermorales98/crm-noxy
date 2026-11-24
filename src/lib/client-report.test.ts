import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Node's native TypeScript runner requires an explicit extension.
import { monthLabel, monthRange, paymentTotals, previousMonth, renderClientReport, sameName } from "./client-report.ts";

const base = {
  clientName: "Café Luna",
  period: { year: 2026, month: 10 },
  currency: "USD",
  monthlyFee: 500,
  payments: [
    { amount: 500, status: "RECIBIDO" as const, receivedAt: "5 nov" },
    { amount: 100, status: "PENDIENTE" as const, receivedAt: null },
  ],
  content: { delivered: [{ title: "Reel de otoño", type: "reel", date: "12 oct" }], pending: 2 },
  videos: [
    { title: "Reel de otoño", platform: "TikTok", views: 12000, leads: 4 },
    { title: "Historia", platform: "Instagram", views: null, leads: null },
  ],
};

test("fechas del informe", () => {
  assert.deepEqual(previousMonth(new Date("2026-01-03T00:00:00Z")), { year: 2025, month: 12 });
  assert.deepEqual(previousMonth(new Date("2026-11-03T00:00:00Z")), { year: 2026, month: 10 });
  assert.equal(monthLabel({ year: 2026, month: 3 }), "marzo 2026");
  const r = monthRange({ year: 2026, month: 12 });
  assert.equal(r.from.toISOString(), "2026-12-01T00:00:00.000Z");
  assert.equal(r.to.toISOString(), "2027-01-01T00:00:00.000Z");
  assert.equal(sameName("Café  Luna", "cafe luna"), true);
});

test("totales de cobros", () => {
  assert.deepEqual(paymentTotals(base.payments), { received: 500, pending: 100 });
});

test("el informe usa solo lo que hay en los datos", () => {
  const md = renderClientReport(base);
  assert.match(md, /Informe de octubre 2026 — Café Luna/);
  assert.match(md, /Cobrado en el mes: \$500 USD/);
  assert.match(md, /Pendiente de cobro: \$100 USD/);
  assert.match(md, /Piezas de contenido entregadas: 1 \(quedan 2 sin subir\)/);
  assert.match(md, /Vistas totales: 12,?000/);
  assert.match(md, /Reel de otoño \(TikTok\)/);
});

test("las secciones sin datos lo dicen en vez de inventar", () => {
  const md = renderClientReport({ ...base, content: null, videos: [], payments: [] });
  assert.match(md, /No hay un cliente de contenido con este nombre/);
  assert.match(md, /Sin videos registrados/);
  assert.match(md, /No hay cobros registrados/);
  assert.doesNotMatch(md, /Pendiente de cobro/);
});
