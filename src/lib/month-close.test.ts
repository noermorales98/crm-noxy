import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error: node --test carga el .ts directo
import { buildMonthMetrics, isFinalWonStage, monthKeyInZone, monthKeysBetween, monthRangeInZone, nextMonthKey, previousMonthKey } from "./month-close.ts";

test("previousMonthKey y nextMonthKey cruzan el año", () => {
  assert.equal(previousMonthKey("2026-01"), "2025-12");
  assert.equal(previousMonthKey("2026-11"), "2026-10");
  assert.equal(nextMonthKey("2026-12"), "2027-01");
});

test("monthKeyInZone respeta la zona: 1 de noviembre 02:00 UTC sigue siendo octubre en Cancún", () => {
  const instant = new Date("2026-11-01T02:00:00Z");
  assert.equal(monthKeyInZone(instant, "UTC"), "2026-11");
  assert.equal(monthKeyInZone(instant, "America/Cancun"), "2026-10");
});

test("monthRangeInZone: octubre en Cancún (UTC-5) empieza 05:00 UTC y termina donde empieza noviembre", () => {
  const { from, to } = monthRangeInZone("2026-10", "America/Cancun");
  assert.equal(from.toISOString(), "2026-10-01T05:00:00.000Z");
  assert.equal(to.toISOString(), "2026-11-01T05:00:00.000Z");
  assert.equal(monthRangeInZone("2026-10", "UTC").from.toISOString(), "2026-10-01T00:00:00.000Z");
});

test("monthKeysBetween incluye ambos extremos y respeta el tope", () => {
  assert.deepEqual(monthKeysBetween("2026-09", "2026-11"), ["2026-09", "2026-10", "2026-11"]);
  assert.deepEqual(monthKeysBetween("2026-11", "2026-10"), []);
  assert.equal(monthKeysBetween("2020-01", "2026-11", 5).length, 5);
});

test("buildMonthMetrics suma por moneda, usa el valor de cotizaciones y calcula la tasa", () => {
  const metrics = buildMonthMetrics({
    month: "2026-10",
    created: 7,
    won: [
      { value: 4000, currency: "MXN", quotes: [] },
      { value: null, currency: "USD", quotes: [{ status: "PAGADA", total: 500, currency: "USD" }] },
    ],
    lostCount: 2,
    payments: [{ amount: 100, currency: "USD" }, { amount: 50, currency: "USD" }],
    open: [{ value: 1000, currency: "MXN" }, { value: null, currency: "MXN" }],
  });
  assert.deepEqual(metrics.won, { count: 2, byCurrency: { MXN: 4000, USD: 500 } });
  assert.equal(metrics.closingRate, 50);
  assert.equal(metrics.withQuote, 1);
  assert.equal(metrics.withoutQuote, 1);
  assert.deepEqual(metrics.paymentsReceived, { USD: 150 });
  assert.deepEqual(metrics.openAtClose, { count: 2, byCurrency: { MXN: 1000 } });
});

test("buildMonthMetrics: mes sin cierres no inventa tasa ni «abierto»", () => {
  const metrics = buildMonthMetrics({ month: "2026-09", created: 0, won: [], lostCount: 0, payments: [] });
  assert.equal(metrics.closingRate, null);
  assert.equal(metrics.openAtClose, undefined);
});

test("isFinalWonStage archiva solo la etapa ganada final o la legado «Ganado»", () => {
  assert.equal(isFinalWonStage({ order: 6, name: "Entregado" }, 6), true);
  assert.equal(isFinalWonStage({ order: 5, name: "En producción" }, 6), false);
  assert.equal(isFinalWonStage({ order: 3, name: " Ganado " }, 6), true);
});

// auto-archive: solo etapa final ganadora, contando desde que se ganó.
// @ts-expect-error: node --test carga el .ts directo
import { isAutoArchivable } from "./month-close.ts";
test("isAutoArchivable: la última etapa ganadora vieja se archiva; la de producción nunca", () => {
  const threshold = new Date("2026-11-01T00:00:00Z");
  const old = new Date("2026-09-01T00:00:00Z");
  const fresh = new Date("2026-11-20T00:00:00Z");
  // pipeline con etapas ganadoras de orden 4 (anticipo), 5 (producción), 6 (entregado): la final es 6
  assert.equal(isAutoArchivable({ wonAt: old, updatedAt: fresh, stage: { order: 6, name: "Entregado" } }, 6, threshold), true, "cuenta desde wonAt, no desde la última edición");
  assert.equal(isAutoArchivable({ wonAt: old, updatedAt: old, stage: { order: 5, name: "En producción" } }, 6, threshold), false, "producción es trabajo en curso");
  assert.equal(isAutoArchivable({ wonAt: old, updatedAt: old, stage: { order: 4, name: "Anticipo pagado" } }, 6, threshold), false);
  assert.equal(isAutoArchivable({ wonAt: fresh, updatedAt: fresh, stage: { order: 6, name: "Entregado" } }, 6, threshold), false, "aún no cumple los días");
  assert.equal(isAutoArchivable({ wonAt: null, updatedAt: old, stage: { order: 7, name: "Ganado" } }, 7, threshold), true, "sin wonAt usa updatedAt");
});

test("sumMonthMetrics suma los meses, por moneda, y recalcula la tasa de cierre", async () => {
  const { sumMonthMetrics } = await import("./month-close.ts");
  const month = (m: string, wonCount: number, mxn: number, lost: number) => ({
    month: m, created: 2, won: { count: wonCount, byCurrency: { MXN: mxn } }, lost: { count: lost },
    closingRate: null, withQuote: 1, withoutQuote: wonCount - 1, paymentsReceived: { MXN: 100 },
    openAtClose: { count: 9, byCurrency: { MXN: 9 } },
  });
  const year = sumMonthMetrics(2026, [month("2026-10", 2, 3000, 1), month("2026-11", 1, 500, 0)]);
  assert.equal(year.created, 4);
  assert.deepEqual(year.won, { count: 3, byCurrency: { MXN: 3500 } });
  assert.equal(year.lost.count, 1);
  assert.equal(year.closingRate, 75);
  assert.deepEqual(year.paymentsReceived, { MXN: 200 });
  assert.equal(year.openAtClose, undefined);
});

test("inProgressReason: ganada pero sin terminar = etapa ganada no final o saldo por cobrar", async () => {
  const { inProgressReason } = await import("./month-close.ts");
  const stage = (order: number, name: string) => ({ order, name });
  // etapas ganadas del pipeline: 4 Anticipo pagado, 5 En producción, 6 Entregado, 7 Ganado (la final)
  assert.equal(inProgressReason({ stage: stage(4, "Anticipo pagado"), quotes: [] }, 7), "En etapa «Anticipo pagado»");
  assert.equal(inProgressReason({ stage: stage(5, "En producción"), quotes: [{ status: "PAGADA" }] }, 7), "En etapa «En producción»");
  assert.equal(inProgressReason({ stage: stage(7, "Ganado"), quotes: [{ status: "PARCIAL" }] }, 7), "Falta cobrar el saldo");
  assert.equal(inProgressReason({ stage: stage(7, "Ganado"), quotes: [{ status: "PAGADA" }] }, 7), null);
  assert.equal(inProgressReason({ stage: stage(7, "Ganado"), quotes: [] }, 7), null);
});
