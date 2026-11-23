import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error: node --test carga el .ts directo
import { clearCache, readCache, writeCache } from "./client-cache.ts";

test("lo guardado se lee mientras no caduque y caduca después", () => {
  writeCache("a", [1, 2], 1_000);
  assert.deepEqual(readCache("a", 5_000, 3_000), [1, 2]);
  assert.equal(readCache("a", 5_000, 7_000), undefined);
  assert.equal(readCache("nunca", 5_000), undefined);
});

test("clearCache borra por prefijo o todo", () => {
  writeCache("org1:deals", 1);
  writeCache("org1:contacts", 2);
  writeCache("org2:deals", 3);
  clearCache("org1:");
  assert.equal(readCache("org1:deals", 1e9), undefined);
  assert.equal(readCache("org2:deals", 1e9), 3);
  clearCache();
  assert.equal(readCache("org2:deals", 1e9), undefined);
});
