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
