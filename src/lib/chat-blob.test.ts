import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Node's native TypeScript runner requires an explicit extension.
import { chatPalette, contrastRatio, mixHex } from "./chat-blob.ts";

test("mixHex mezcla los extremos", () => {
  assert.equal(mixHex("#000000", "#ffffff", 0), "#000000");
  assert.equal(mixHex("#000000", "#ffffff", 1), "#ffffff");
});

test("la letra del mensaje siempre tiene contraste 7:1 sobre su fondo, con cualquier color de criatura", () => {
  const accents = ["#af95f3", "#c9e35e", "#ffd400", "#ff3b30", "#0a84ff", "#ffffff", "#000000", "#7fffd4", "#222222"];
  const inks = ["#100e17", "#0e1107", "#ffffff", "#777777", "#000000"];
  for (const accent of accents) {
    for (const ink of inks) {
      const p = chatPalette(accent, ink);
      assert.ok(contrastRatio(p.text, p.bubble) >= 7, `${accent}/${ink}: ${contrastRatio(p.text, p.bubble)}`);
    }
  }
});
