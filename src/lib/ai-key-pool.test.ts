import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error: node --test carga el .ts directo
import { addKey, isCoolingDown, markResult, maskKey, moveKey, parsePool, removeKey, serializePool, updateKey, usableKeys } from "./ai-key-pool.ts";

const k = (id: string, extra: Record<string, unknown> = {}) => ({ id, label: id, key: `key-${id}`, enabled: true, failedAt: null, lastStatus: null, ...extra });

test("una clave suelta antigua se lee como la cuenta «Principal»; vacío no da cuentas", () => {
  const pool = parsePool("nvapi-ABCDEFGHIJKLMNOP1234");
  assert.equal(pool.length, 1);
  assert.equal(pool[0].label, "Principal");
  assert.equal(pool[0].key, "nvapi-ABCDEFGHIJKLMNOP1234");
  assert.deepEqual(parsePool(""), []);
  assert.deepEqual(parsePool(null), []);
});

test("ida y vuelta del formato nuevo y tolerancia a JSON roto", () => {
  const pool = [k("a"), k("b", { enabled: false, failedAt: "2026-11-23T10:00:00.000Z", lastStatus: 402 })];
  assert.deepEqual(parsePool(serializePool(pool)), pool);
  assert.equal(parsePool("{no es json").length, 1, "texto que parece JSON pero no lo es → clave suelta");
});

test("addKey: etiqueta por defecto, sin duplicados, sin pasar del tope", () => {
  const first = addKey([], { key: " abc " });
  assert.ok(first.ok);
  assert.equal(first.pool[0].key, "abc");
  assert.equal(first.pool[0].label, "Cuenta 1");
  assert.equal(addKey(first.pool, { key: "abc" }).ok, false);
  assert.equal(addKey([], { key: "  " }).ok, false);
  const full = Array.from({ length: 10 }, (_, i) => k(String(i)));
  assert.equal(addKey(full, { key: "otra" }).ok, false);
});

test("quitar, apagar/encender (encender limpia el fallo) y renombrar", () => {
  const pool = [k("a", { failedAt: "2026-11-23T10:00:00.000Z", lastStatus: 402 }), k("b")];
  assert.deepEqual(removeKey(pool, "a").map((x: { id: string }) => x.id), ["b"]);
  const off = updateKey(pool, "a", { enabled: false });
  assert.equal(off[0].enabled, false);
  const on = updateKey(off, "a", { enabled: true });
  assert.equal(on[0].failedAt, null);
  assert.equal(updateKey(pool, "b", { label: "  Cuenta de Ana " })[1].label, "Cuenta de Ana");
  assert.equal(updateKey(pool, "b", { label: "   " })[1].label, "b", "una etiqueta vacía no se aplica");
});

test("moveKey sube y baja sin salirse de los extremos", () => {
  const pool = [k("a"), k("b"), k("c")];
  assert.deepEqual(moveKey(pool, "c", "up").map((x: { id: string }) => x.id), ["a", "c", "b"]);
  assert.deepEqual(moveKey(pool, "a", "up").map((x: { id: string }) => x.id), ["a", "b", "c"]);
  assert.deepEqual(moveKey(pool, "c", "down").map((x: { id: string }) => x.id), ["a", "b", "c"]);
});

test("usableKeys: las apagadas no entran y las que fallaron hace poco van al final, sin perderse", () => {
  const now = Date.parse("2026-11-23T12:00:00Z");
  const pool = [k("a", { failedAt: "2026-11-23T11:50:00.000Z", lastStatus: 402 }), k("b", { enabled: false }), k("c")];
  assert.deepEqual(usableKeys(pool, now).map((x: { id: string }) => x.id), ["c", "a"]);
  // Pasado el enfriamiento de un fallo persistente (30 min), vuelve a su lugar.
  assert.deepEqual(usableKeys(pool, now + 31 * 60_000).map((x: { id: string }) => x.id), ["a", "c"]);
});

test("el enfriamiento es largo para clave mala o sin créditos y corto para límite de ritmo", () => {
  const now = Date.parse("2026-11-23T12:00:00Z");
  const failed = (status: number) => k("x", { failedAt: new Date(now - 5 * 60_000).toISOString(), lastStatus: status });
  assert.equal(isCoolingDown(failed(402), now), true);
  assert.equal(isCoolingDown(failed(429), now), false);
});

test("markResult guarda el fallo y un éxito lo limpia", () => {
  const pool = [k("a")];
  const failed = markResult(pool, "a", 402, Date.parse("2026-11-23T12:00:00Z"));
  assert.equal(failed[0].lastStatus, 402);
  assert.ok(failed[0].failedAt);
  const ok = markResult(failed, "a", 200);
  assert.equal(ok[0].failedAt, null);
  assert.equal(ok[0].lastStatus, null);
});

test("maskKey nunca devuelve la clave completa", () => {
  assert.equal(maskKey("nvapi-AAAAAAAAAAAAAAAAWXYZ"), "nvapi-…WXYZ");
  assert.equal(maskKey("sk-or-v1-abcdef1234567890"), "sk-or-…7890");
  assert.equal(maskKey("corta"), "••••");
});
