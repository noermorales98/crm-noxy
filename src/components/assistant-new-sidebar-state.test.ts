import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Node's native TypeScript runner requires an explicit extension.
import { assistantNewSidebarReducer, isAssistantNewRoute } from "./assistant-new-sidebar-state.ts";

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
