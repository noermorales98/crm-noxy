import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Node's native TypeScript runner requires an explicit extension.
import { brandVoiceBlock, matchBrands } from "./ai-brand-match.ts";

const brands = [
  { id: "1", name: "Café Luna" },
  { id: "2", name: "Luna" },
  { id: "3", name: "Dental Norte" },
  { id: "4", name: "Ana" },
  { id: "5", name: "AB" },
];

test("detecta la marca sin acentos ni mayúsculas y como palabra entera", () => {
  assert.deepEqual(matchBrands("hazme un reel para dental norte", brands).map((b: { id: string }) => b.id), ["3"]);
  assert.deepEqual(matchBrands("la banana de Ana", brands).map((b: { id: string }) => b.id), ["4"]);
  assert.deepEqual(matchBrands("algo con cafe luna!", brands).map((b: { id: string }) => b.id), ["1"]);
});

test("la marca más larga gana a la contenida y no se repite", () => {
  assert.deepEqual(matchBrands("guion para Café Luna", brands).map((b: { id: string }) => b.id), ["1"]);
});

test("ignora nombres demasiado cortos y respeta el tope", () => {
  assert.deepEqual(matchBrands("ab ab ab", brands), []);
  assert.equal(matchBrands("Dental Norte, Ana y Luna", brands, 2).length, 2);
});

test("dos marcas con tonos distintos producen bloques de voz distintos", () => {
  const a = brandVoiceBlock("Café Luna", "Tono cálido, tutea, emojis ☕", null);
  const b = brandVoiceBlock("Dental Norte", "Tono profesional, usted, sin emojis", "Clínica dental");
  assert.notEqual(a, b);
  assert.match(a, /cálido/);
  assert.match(b, /usted/);
  assert.doesNotMatch(b, /cálido/);
});

test("sin voz guardada lo dice, no la inventa", () => {
  assert.match(brandVoiceBlock("Luna", "  ", null), /sin definir/);
});
