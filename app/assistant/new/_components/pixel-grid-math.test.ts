import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Node's native TypeScript runner requires an explicit extension.
import { edgeNoise, isInsideHoverBlob, organicRadius, shuffleIndices } from "./pixel-grid-math.ts";

test("shuffleIndices returns each index exactly once", () => {
  const values = [0.9, 0.1, 0.7, 0.2, 0.4];
  let cursor = 0;
  const shuffled = shuffleIndices(6, () => values[cursor++ % values.length]);
  assert.deepEqual([...shuffled].sort((a, b) => a - b), [0, 1, 2, 3, 4, 5]);
});

test("edgeNoise is deterministic for the same cell and time", () => {
  assert.equal(edgeNoise(4, 7, 1234), edgeNoise(4, 7, 1234));
});

test("organicRadius follows the approved modulation formula", () => {
  const angle = Math.PI / 3;
  const time = 850;
  const noise = 0.4;
  const expected = (
    Math.sin(angle * 3 + time * 0.0011) * 0.55
    + Math.sin(angle * 5 - time * 0.0017 + 1.3) * 0.30
    + Math.sin(angle * 2 + time * 0.0007 + 2.1) * 0.20
  ) * (0.95 + noise * 0.30);
  assert.equal(organicRadius(angle, time, noise), expected);
});

test("center cells are inside the four-cell hover blob", () => {
  assert.equal(isInsideHoverBlob(5, 5, 5, 5, 0, 0.5), true);
  assert.equal(isInsideHoverBlob(12, 12, 5, 5, 0, 0.5), false);
});
