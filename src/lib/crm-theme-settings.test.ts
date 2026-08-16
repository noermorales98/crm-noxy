import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Node's native TypeScript runner requires an explicit extension.
import { parseCrmThemePatch } from "./crm-theme-settings.ts";

test("accepts a known CRM theme identifier", () => {
  assert.deepEqual(parseCrmThemePatch({ theme: "noxy-obsidian" }), {
    ok: true,
    theme: "noxy-obsidian",
  });
});

test("rejects missing, non-string, and unknown theme values", () => {
  for (const payload of [{}, { theme: null }, { theme: 7 }, { theme: "dark" }]) {
    const result = parseCrmThemePatch(payload);
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error, "Selecciona un tema válido.");
  }
});

test("rejects payloads that are not JSON objects", () => {
  for (const payload of [null, undefined, "noxy-indigo", ["noxy-indigo"]]) {
    assert.equal(parseCrmThemePatch(payload).ok, false);
  }
});
