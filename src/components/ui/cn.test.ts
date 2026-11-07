import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Node's native TypeScript runner requires an explicit extension.
import { cn } from "./cn.ts";

test("cn joins truthy class names with single spaces", () => {
  assert.equal(cn("a", "b"), "a b");
});

test("cn drops false, null, undefined and empty strings", () => {
  const dragging = false;
  assert.equal(cn("card", dragging && "shadow", null, undefined, "", "p-3"), "card p-3");
  assert.equal(cn(), "");
});
