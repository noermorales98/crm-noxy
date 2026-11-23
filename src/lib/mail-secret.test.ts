import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error: node --test carga el .ts directo
import { openMailSecret, sealMailSecret } from "./mail-secret.ts";
// @ts-expect-error: node --test carga el .ts directo
import { isEncryptedSecret } from "./secret-box.ts";

const KEY = "clave-de-prueba";

test("la contraseña se guarda cifrada y vuelve igual", () => {
  const stored = sealMailSecret("S3cr3t!", KEY)!;
  assert.ok(isEncryptedSecret(stored));
  assert.notEqual(stored, "S3cr3t!");
  assert.equal(openMailSecret(stored, KEY), "S3cr3t!");
});

test("cifrar dos veces no cifra lo cifrado (idempotente)", () => {
  const once = sealMailSecret("abc", KEY)!;
  assert.equal(sealMailSecret(once, KEY), once);
});

test("texto plano antiguo se sigue leyendo hasta migrarlo", () => {
  assert.equal(openMailSecret("clave-vieja", KEY), "clave-vieja");
});

test("vacío o nulo no se guarda ni se devuelve", () => {
  assert.equal(sealMailSecret("", KEY), null);
  assert.equal(sealMailSecret(null, KEY), null);
  assert.equal(openMailSecret(null, KEY), null);
  assert.equal(openMailSecret("", KEY), null);
});

test("con otra clave o dato dañado devuelve null, nunca la caja cruda", () => {
  const stored = sealMailSecret("abc", KEY)!;
  assert.equal(openMailSecret(stored, "otra-clave"), null);
  assert.equal(openMailSecret(stored.slice(0, -4) + "AAAA", KEY), null);
});
