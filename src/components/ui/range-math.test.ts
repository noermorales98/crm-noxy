import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error: node --test carga el .ts directo
import { clampToStep, keyboardValue, valueFromPosition } from "./range-math.ts";

test("clampToStep rounds to the step and stays inside the range", () => {
  assert.equal(clampToStep(47, 0, 100, 5), 45);
  assert.equal(clampToStep(48, 0, 100, 5), 50);
  assert.equal(clampToStep(-20, 0, 100, 5), 0);
  assert.equal(clampToStep(180, 0, 100, 5), 100);
  assert.equal(clampToStep(12.4, 10, 20, 1), 12);
});

test("valueFromPosition maps a pointer position over the track to a value", () => {
  const track = { left: 100, width: 200 };
  assert.equal(valueFromPosition(100, track, 0, 100, 5), 0);
  assert.equal(valueFromPosition(200, track, 0, 100, 5), 50);
  assert.equal(valueFromPosition(300, track, 0, 100, 5), 100);
  assert.equal(valueFromPosition(50, track, 0, 100, 5), 0, "left of the track");
  assert.equal(valueFromPosition(900, track, 0, 100, 5), 100, "right of the track");
  assert.equal(valueFromPosition(10, { left: 0, width: 0 }, 0, 100, 5), 0, "zero-width track does not divide by zero");
});

test("keyboardValue handles arrows, page keys, home and end, and ignores other keys", () => {
  assert.equal(keyboardValue("ArrowRight", 50, 0, 100, 5), 55);
  assert.equal(keyboardValue("ArrowUp", 50, 0, 100, 5), 55);
  assert.equal(keyboardValue("ArrowLeft", 50, 0, 100, 5), 45);
  assert.equal(keyboardValue("ArrowDown", 0, 0, 100, 5), 0, "does not go below the minimum");
  assert.equal(keyboardValue("PageUp", 50, 0, 100, 5), 60);
  assert.equal(keyboardValue("PageDown", 50, 0, 100, 5), 40);
  assert.equal(keyboardValue("Home", 50, 0, 100, 5), 0);
  assert.equal(keyboardValue("End", 50, 0, 100, 5), 100);
  assert.equal(keyboardValue("a", 50, 0, 100, 5), null);
});
