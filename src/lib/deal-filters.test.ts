import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error: node --test carga el .ts directo
import { ACTIVE_DEALS, dealArchiveFilter, wantsArchived } from "./deal-filters.ts";

test("ACTIVE_DEALS excluye archivados", () => {
  assert.deepEqual(ACTIVE_DEALS, { isArchived: false });
});

test("dealArchiveFilter filtra por defecto y no filtra si se piden archivados", () => {
  assert.deepEqual(dealArchiveFilter(), { isArchived: false });
  assert.deepEqual(dealArchiveFilter(false), { isArchived: false });
  assert.deepEqual(dealArchiveFilter(true), {});
});

test("wantsArchived solo acepta 1 o true", () => {
  assert.equal(wantsArchived("1"), true);
  assert.equal(wantsArchived("true"), true);
  assert.equal(wantsArchived("0"), false);
  assert.equal(wantsArchived(null), false);
  assert.equal(wantsArchived(undefined), false);
});
