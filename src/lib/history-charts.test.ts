import test from "node:test";
import assert from "node:assert/strict";
import { bucketDeals, outcomeCounts } from "./history-charts.ts";

const won = { isWon: true };
const lost = { isLost: true };

test("todo el año: 12 cubos y cada moneda va por separado", () => {
  const buckets = bucketDeals(
    [
      { value: 1000, currency: "MXN", wonAt: "2026-03-10T12:00:00", stage: won },
      { value: 50, currency: "USD", wonAt: "2026-03-20T12:00:00", stage: won },
      { value: 200, currency: "MXN", wonAt: "2026-11-02T12:00:00", stage: won },
    ],
    2026,
    "",
  );
  assert.equal(buckets.length, 12);
  assert.equal(buckets[2].MXN, 1000);
  assert.equal(buckets[2].USD, 50);
  assert.equal(buckets[10].MXN, 200);
  assert.equal(buckets[0].won, 0);
});

test("un mes: un cubo por día, y los de otro mes o año se ignoran", () => {
  const buckets = bucketDeals(
    [
      { value: 300, currency: "MXN", wonAt: "2026-11-24T12:00:00", stage: won },
      { value: 999, currency: "MXN", wonAt: "2026-10-24T12:00:00", stage: won },
      { value: 999, currency: "MXN", wonAt: "2025-11-24T12:00:00", stage: won },
    ],
    2026,
    11,
  );
  assert.equal(buckets.length, 30);
  assert.equal(buckets[23].MXN, 300);
  assert.equal(buckets.reduce((s, b) => s + b.MXN, 0), 300);
});

test("sin wonAt usa archivedAt; los perdidos cuentan sin sumar dinero", () => {
  const buckets = bucketDeals([{ value: 80, currency: "USD", archivedAt: "2026-01-05T12:00:00", stage: lost }], 2026, "");
  assert.equal(buckets[0].lost, 1);
  assert.equal(buckets[0].USD, 0);
});

test("tasa de cierre: ganados ÷ cerrados, null sin cierres", () => {
  assert.deepEqual(outcomeCounts([{ stage: won }, { stage: won }, { stage: lost }]), { won: 2, lost: 1, rate: 67 });
  assert.equal(outcomeCounts([]).rate, null);
});

test("cada cubo trae su nombre completo para el tooltip", () => {
  assert.equal(bucketDeals([], 2026, "")[10].full, "noviembre 2026");
  assert.equal(bucketDeals([], 2026, 11)[23].full, "24 de noviembre 2026");
});

test("cuenta las ventas de cada moneda en su cubo", () => {
  const [, , mar] = bucketDeals(
    [
      { value: 1, currency: "MXN", wonAt: "2026-03-10T12:00:00", stage: won },
      { value: 2, currency: "MXN", wonAt: "2026-03-11T12:00:00", stage: won },
      { value: 3, currency: "USD", wonAt: "2026-03-12T12:00:00", stage: won },
    ],
    2026,
    "",
  );
  assert.deepEqual([mar.nMXN, mar.nUSD], [2, 1]);
});
