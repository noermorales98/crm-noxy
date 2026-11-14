import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error: node --test carga el .ts directo
import { summarizeReferrals } from "./referrals.ts";

const deal = (id: string, referrerId: string, name: string, stage: { isWon: boolean; isLost: boolean }, value: number | null, currency = "USD") =>
  ({ id, referrerId, referrerName: name, stage, value, currency });
const open = { isWon: false, isLost: false };
const won = { isWon: true, isLost: false };
const lost = { isWon: false, isLost: true };

test("cuenta referidos por cliente con ganados, perdidos y abiertos", () => {
  const rows: any[] = summarizeReferrals([
    deal("1", "a", "Ana", won, 1000),
    deal("2", "a", "Ana", open, 500),
    deal("3", "a", "Ana", lost, 200),
    deal("4", "b", "Beto", won, 300, "MXN"),
  ]);
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0], { referrerId: "a", name: "Ana", referrals: 3, won: 1, lost: 1, open: 1, wonValue: { USD: 1000 } });
  assert.deepEqual(rows[1].wonValue, { MXN: 300 });
});

test("ordena por referidos y tolera valor nulo; sin deals no hay filas", () => {
  const rows: any[] = summarizeReferrals([deal("1", "a", "Ana", won, null), deal("2", "b", "Beto", open, 1), deal("3", "b", "Beto", open, 1)]);
  assert.deepEqual(rows.map((r) => r.name), ["Beto", "Ana"]);
  assert.deepEqual(rows[1].wonValue, { USD: 0 });
  assert.deepEqual(summarizeReferrals([]), []);
});
