import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Node's native TypeScript runner requires an explicit extension.
import { assistantNewSidebarReducer, getSidebarFocusTarget, isAssistantNewRoute } from "./assistant-new-sidebar-state.ts";

test("floating sidebar is exclusive to the exact assistant new route", () => {
  assert.equal(isAssistantNewRoute("/assistant/new"), true);
  assert.equal(isAssistantNewRoute("/assistant"), false);
  assert.equal(isAssistantNewRoute("/assistant/abc"), false);
  assert.equal(isAssistantNewRoute("/assistant/new/extra"), false);
});

test("assistant new sidebar supports explicit open, close, and toggle actions", () => {
  assert.equal(assistantNewSidebarReducer("closed", { type: "open" }), "open");
  assert.equal(assistantNewSidebarReducer("open", { type: "close" }), "closed");
  assert.equal(assistantNewSidebarReducer("closed", { type: "toggle" }), "open");
  assert.equal(assistantNewSidebarReducer("open", { type: "toggle" }), "closed");
});

test("mobile sidebar focus wraps at its boundaries", () => {
  assert.equal(getSidebarFocusTarget(-1, 0, "forward"), null);
  assert.equal(getSidebarFocusTarget(-1, 3, "forward"), 0);
  assert.equal(getSidebarFocusTarget(-1, 3, "backward"), 2);
  assert.equal(getSidebarFocusTarget(2, 3, "forward"), 0);
  assert.equal(getSidebarFocusTarget(0, 3, "backward"), 2);
  assert.equal(getSidebarFocusTarget(1, 3, "forward"), null);
  assert.equal(getSidebarFocusTarget(1, 3, "backward"), null);
});
