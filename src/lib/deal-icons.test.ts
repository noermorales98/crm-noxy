import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error: node --test carga el .ts directo
import { DEAL_ICON_KEYS, DEAL_ICON_LABELS, DEFAULT_DEAL_ICON, normalizeDealIcon } from "./deal-icons.ts";

test("normalizeDealIcon keeps known keys and rejects everything else", () => {
  assert.equal(normalizeDealIcon("rocket"), "rocket");
  assert.equal(normalizeDealIcon("  star "), "star");
  assert.equal(normalizeDealIcon("not-an-icon"), null);
  assert.equal(normalizeDealIcon(""), null);
  assert.equal(normalizeDealIcon(null), null);
  assert.equal(normalizeDealIcon(42), null);
  assert.equal(normalizeDealIcon("__proto__"), null, "prototype keys are not icons");
});

test("every icon key has a Spanish label and the default is one of them", () => {
  assert.ok(DEAL_ICON_KEYS.length >= 12);
  assert.equal(new Set(DEAL_ICON_KEYS).size, DEAL_ICON_KEYS.length, "no duplicates");
  for (const key of DEAL_ICON_KEYS) assert.ok(DEAL_ICON_LABELS[key], `label for ${key}`);
  assert.ok(DEAL_ICON_KEYS.includes(DEFAULT_DEAL_ICON));
});
