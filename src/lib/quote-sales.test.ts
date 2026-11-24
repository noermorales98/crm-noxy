import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error: node --test carga el .ts directo
import { quoteReceipts, quoteSaleDate, receiptsInRange } from "./quote-sales.ts";

const d = (s: string) => new Date(`${s}T12:00:00Z`);
const base = { total: 100, currency: "USD", splitPayment: false, depositPercent: null, acceptedAt: null, paidAt: null, depositPaidAt: null, finalPaidAt: null };

test("la fecha de la venta es la primera entre aceptación y pagos", () => {
  assert.deepEqual(quoteSaleDate({ ...base, acceptedAt: d("2026-08-06"), paidAt: d("2026-08-25") }), d("2026-08-06"));
  assert.deepEqual(quoteSaleDate({ ...base, depositPaidAt: d("2026-08-31"), acceptedAt: d("2026-09-02") }), d("2026-08-31"));
  assert.equal(quoteSaleDate(base), null);
});

test("pago único: el total en la fecha de pago; sin pago, nada", () => {
  assert.deepEqual(quoteReceipts({ ...base, paidAt: d("2026-08-06") }), [{ amount: 100, currency: "USD", at: d("2026-08-06") }]);
  assert.deepEqual(quoteReceipts(base), []);
});

test("dos pagos: anticipo y resto por separado, y cada uno en su fecha", () => {
  const split = { ...base, total: 13000, currency: "MXN", splitPayment: true, depositPercent: 50 };
  assert.deepEqual(quoteReceipts({ ...split, depositPaidAt: d("2026-10-21") }), [{ amount: 6500, currency: "MXN", at: d("2026-10-21") }]);
  assert.deepEqual(quoteReceipts({ ...split, depositPaidAt: d("2026-10-21"), finalPaidAt: d("2026-11-10") }).map((r: { amount: number }) => r.amount), [6500, 6500]);
});

test("dos pagos con el final confirmado a mano y sin anticipo: ese pago cubre el total", () => {
  const split = { ...base, splitPayment: true, depositPercent: 30, finalPaidAt: d("2026-09-01") };
  assert.deepEqual(quoteReceipts(split), [{ amount: 100, currency: "USD", at: d("2026-09-01") }]);
});

test("receiptsInRange solo cuenta lo cobrado dentro del rango [from, to)", () => {
  const quotes = [
    { ...base, paidAt: d("2026-08-06") },
    { ...base, total: 50, paidAt: d("2026-09-01") },
  ];
  assert.deepEqual(receiptsInRange(quotes, d("2026-08-01"), d("2026-09-01")), [{ amount: 100, currency: "USD" }]);
});

test("saleDateChoices: un mismo día es una sola opción; días distintos obligan a preguntar", async () => {
  const { saleDateChoices } = await import("./quote-sales.ts");
  const tz = "America/Cancun";
  const same = saleDateChoices({ ...base, acceptedAt: new Date("2026-08-06T14:46:00Z"), paidAt: new Date("2026-08-06T14:48:00Z") }, null, tz);
  assert.equal(same.length, 1);
  assert.equal(same[0].reason, "Cotización aceptada · Cotización pagada");
  const apart = saleDateChoices({ ...base, acceptedAt: new Date("2026-08-06T14:46:00Z"), paidAt: new Date("2026-08-25T13:19:00Z") }, new Date("2026-11-18T18:08:00Z"), tz);
  assert.deepEqual(apart.map((c: { day: string }) => c.day), ["2026-08-06", "2026-08-25", "2026-11-18"]);
  assert.equal(apart[2].reason, "Deal marcado como ganado");
});

test("saleDateChoices: sin fechas no hay opciones; el día se mide en la zona de la organización", async () => {
  const { saleDateChoices } = await import("./quote-sales.ts");
  assert.deepEqual(saleDateChoices(base, null, "America/Cancun"), []);
  // 02:00 UTC del día 7 sigue siendo el día 6 en Cancún (UTC-5)
  const [only] = saleDateChoices({ ...base, paidAt: new Date("2026-08-07T02:00:00Z") }, null, "America/Cancun");
  assert.equal(only.day, "2026-08-06");
});
