import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
// @ts-expect-error: node --test carga el .ts directo
import { encryptSecret, isEncryptedSecret } from "./secret-box.ts";
// @ts-expect-error: node --test carga el .ts directo
import { notesAreEncrypted, openVaultEntry, sealValue, sealVaultData } from "./vault-crypto.ts";

const KEY = "clave-de-prueba-suficientemente-larga-para-el-test";
const OTHER = "otra-clave-distinta-de-la-anterior-123456";

test("password and credential notes are stored encrypted and round-trip", () => {
  const stored = sealVaultData({ type: "credential", password: "Hunter2!", notes: "PIN 4321" }, KEY);
  assert.ok(isEncryptedSecret(stored.password!));
  assert.ok(isEncryptedSecret(stored.notes!));
  assert.ok(!JSON.stringify(stored).includes("Hunter2!") && !JSON.stringify(stored).includes("4321"));
  const shown = openVaultEntry({ id: "1", ...stored }, KEY);
  assert.equal(shown.password, "Hunter2!");
  assert.equal(shown.notes, "PIN 4321");
  assert.equal(shown.unreadable, false);
});

test("notes of non-credential entries stay readable text; password is still encrypted", () => {
  for (const type of ["social", "note"]) {
    assert.equal(notesAreEncrypted(type), false);
    const stored = sealVaultData({ type, password: "p", notes: "texto visible" }, KEY);
    assert.equal(stored.notes, "texto visible");
    assert.ok(isEncryptedSecret(stored.password!));
  }
});

test("empty values stay null and only fields present are touched", () => {
  assert.deepEqual(sealVaultData({ type: "credential", password: "", notes: null }, KEY), { type: "credential", password: null, notes: null });
  assert.ok(!("password" in sealVaultData({ type: "credential", notes: "x" }, KEY)));
});

test("sealing is idempotent: an already-encrypted value is not encrypted twice", () => {
  const once = sealValue("secreto", KEY)!;
  assert.equal(sealValue(once, KEY), once);
});

test("legacy plain-text rows are shown as they are until migrated", () => {
  const shown = openVaultEntry({ type: "credential", password: "vieja-en-claro", notes: "nota" }, KEY);
  assert.equal(shown.password, "vieja-en-claro");
  assert.equal(shown.unreadable, false);
});

test("an unreadable box never reaches the client as raw ciphertext", () => {
  const box = encryptSecret("secreto", KEY);
  const shown = openVaultEntry({ type: "credential", password: box, notes: box }, OTHER);
  assert.equal(shown.password, null);
  assert.equal(shown.notes, null);
  assert.equal(shown.unreadable, true);
  assert.ok(!JSON.stringify(shown).includes("v1:"));
  const tampered = openVaultEntry({ type: "credential", password: box.slice(0, -2) + "AA", notes: null }, KEY);
  assert.equal(tampered.password, null);
  assert.equal(tampered.unreadable, true);
});

test("every response of the vault route goes through openVaultEntry and every write through sealVaultData", () => {
  const src = readFileSync(new URL("../../app/api/clients/[id]/vault/route.ts", import.meta.url), "utf8");
  const bare = src.split("\n").filter((l) => l.includes("NextResponse.json(") && !/\{ (error|success)/.test(l));
  assert.equal(bare.length, 3); // GET, POST, PATCH
  for (const line of bare) assert.match(line, /openVaultEntry/, `respuesta sin descifrar: ${line.trim()}`);
  assert.equal((src.match(/clientVaultEntry\.(create|update)\(/g) ?? []).length, (src.match(/sealVaultData\(/g) ?? []).length);
});
