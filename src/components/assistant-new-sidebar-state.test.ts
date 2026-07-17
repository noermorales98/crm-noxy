import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Node's native TypeScript runner requires an explicit extension.
import { assistantNewSidebarReducer, getSidebarFocusTarget, isAssistantRoute } from "./assistant-new-sidebar-state.ts";

test("floating sidebar is available on supported assistant routes", () => {
  assert.equal(isAssistantRoute("/assistant"), true);
  assert.equal(isAssistantRoute("/assistant/new"), true);
  assert.equal(isAssistantRoute("/assistant/conversation-123"), true);
  assert.equal(isAssistantRoute("/assistant/conversation-123/extra"), false);
  assert.equal(isAssistantRoute("/contacts"), false);
});

test("assistant new sidebar supports explicit open, close, and toggle actions", () => {
  assert.equal(assistantNewSidebarReducer("closed", { type: "open" }), "open");
  assert.equal(assistantNewSidebarReducer("open", { type: "close" }), "closed");
  assert.equal(assistantNewSidebarReducer("closed", { type: "toggle" }), "open");
  assert.equal(assistantNewSidebarReducer("open", { type: "toggle" }), "closed");
  assert.equal(assistantNewSidebarReducer("open", { type: "navigate" }), "closed");
  assert.equal(assistantNewSidebarReducer("closed", { type: "navigate" }), "closed");
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
