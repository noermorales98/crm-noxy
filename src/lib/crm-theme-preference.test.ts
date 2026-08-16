import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Node's native TypeScript runner requires an explicit extension.
import { applyConfirmedTheme, beginThemeSelection, confirmThemeSelection, createThemePreferenceState, rollbackThemeSelection, themeStorageKey } from "./crm-theme-preference.ts";

test("creates user-scoped storage keys", () => {
  assert.equal(themeStorageKey("user-1"), "noxy-crm-theme:user-1");
  assert.equal(themeStorageKey("user 2"), "noxy-crm-theme:user%202");
});

test("initial state resolves invalid cached preferences to Noxy Indigo", () => {
  assert.equal(createThemePreferenceState("removed-theme").activeThemeId, "noxy-indigo");
  assert.equal(createThemePreferenceState("noxy-lavender").confirmedThemeId, "noxy-lavender");
});

test("selection applies optimistically and confirmation makes it durable", () => {
  const initial = createThemePreferenceState("noxy-indigo");
  const saving = beginThemeSelection(initial, "noxy-obsidian", 2);

  assert.equal(saving.activeThemeId, "noxy-obsidian");
  assert.equal(saving.confirmedThemeId, "noxy-indigo");
  assert.equal(saving.saveStatus, "saving");

  const saved = confirmThemeSelection(saving, 2);
  assert.equal(saved.confirmedThemeId, "noxy-obsidian");
  assert.equal(saved.saveStatus, "saved");
});

test("a current save error rolls back while stale responses are ignored", () => {
  const initial = createThemePreferenceState("noxy-indigo");
  const first = beginThemeSelection(initial, "noxy-memory", 1);
  const latest = beginThemeSelection(first, "noxy-lime", 2);

  assert.deepEqual(confirmThemeSelection(latest, 1), latest);
  assert.deepEqual(rollbackThemeSelection(latest, 1), latest);

  const rolledBack = rollbackThemeSelection(latest, 2);
  assert.equal(rolledBack.activeThemeId, "noxy-indigo");
  assert.equal(rolledBack.saveStatus, "error");
});

test("server hydration replaces both active and confirmed preferences", () => {
  const local = createThemePreferenceState("noxy-memory");
  const server = applyConfirmedTheme(local, "noxy-discord");
  assert.equal(server.activeThemeId, "noxy-discord");
  assert.equal(server.confirmedThemeId, "noxy-discord");
  assert.equal(server.saveStatus, "idle");
});
