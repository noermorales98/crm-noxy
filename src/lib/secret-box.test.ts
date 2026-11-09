import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error: node --test carga el .ts directo
import { decryptSecret, encryptSecret, isEncryptedSecret } from "./secret-box.ts";

const KEY = "clave-de-prueba-suficientemente-larga-para-el-test";

test("a secret round-trips and the ciphertext hides the plain text", () => {
  const box = encryptSecret("sk-token-123", KEY);
  assert.ok(isEncryptedSecret(box));
  assert.ok(!box.includes("sk-token-123"));
  assert.equal(decryptSecret(box, KEY), "sk-token-123");
});

test("each encryption uses a fresh nonce", () => {
  assert.notEqual(encryptSecret("igual", KEY), encryptSecret("igual", KEY));
});

test("a wrong key or a tampered box does not decrypt", () => {
  const box = encryptSecret("secreto", KEY);
  assert.equal(decryptSecret(box, "otra-clave-distinta-de-la-anterior-123456"), null);
  const tampered = box.slice(0, -2) + (box.endsWith("AA") ? "BB" : "AA");
  assert.equal(decryptSecret(tampered, KEY), null);
  assert.equal(decryptSecret("no-es-una-caja", KEY), null);
});

test("an empty key is refused", () => {
  assert.throws(() => encryptSecret("x", ""));
});
