import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Node's native TypeScript runner requires an explicit extension.
import {
  CLIENT_PALETTE,
  googleColorIdForHex,
  isPaletteColor,
  nextClientColor,
} from "./content-client-colors.ts";

test("nextClientColor walks the palette and wraps", () => {
  assert.equal(nextClientColor(0), CLIENT_PALETTE[0].hex);
  assert.equal(nextClientColor(1), CLIENT_PALETTE[1].hex);
  assert.equal(nextClientColor(CLIENT_PALETTE.length), CLIENT_PALETTE[0].hex);
  assert.equal(nextClientColor(-1), CLIENT_PALETTE[CLIENT_PALETTE.length - 1].hex);
});

test("isPaletteColor accepts the palette only", () => {
  assert.equal(isPaletteColor(CLIENT_PALETTE[3].hex.toLowerCase()), true);
  assert.equal(isPaletteColor("#ffffff"), false);
  assert.equal(isPaletteColor(null), false);
});

test("googleColorIdForHex uses the palette mapping and falls back by distance", () => {
  assert.equal(googleColorIdForHex("#3545D6"), "9");
  assert.equal(googleColorIdForHex("#dc2127"), "11");
  assert.equal(googleColorIdForHex("nope"), "9");
});
