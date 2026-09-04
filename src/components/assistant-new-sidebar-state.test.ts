import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Node's native TypeScript runner requires an explicit extension.
import {
  ASSISTANT_SIDEBAR_STORAGE_KEY,
  assistantNewSidebarReducer,
  getSidebarFocusTarget,
  isAssistantRoute,
  readAssistantSidebarStoredState,
  writeAssistantSidebarStoredState,
} from "./assistant-new-sidebar-state.ts";

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
  assert.equal(assistantNewSidebarReducer("open", { type: "navigate" }), "open");
  assert.equal(assistantNewSidebarReducer("closed", { type: "navigate" }), "closed");
});

test("assistant sidebar session storage restores and persists open state", () => {
  const memory = new Map<string, string>();
  const previousStorage = globalThis.sessionStorage;
  Object.defineProperty(globalThis, "sessionStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => {
        memory.set(key, value);
      },
      removeItem: (key: string) => {
        memory.delete(key);
      },
    },
  });

  try {
    assert.equal(readAssistantSidebarStoredState(), "closed");
    writeAssistantSidebarStoredState("open");
    assert.equal(memory.get(ASSISTANT_SIDEBAR_STORAGE_KEY), "open");
    assert.equal(readAssistantSidebarStoredState(), "open");
    writeAssistantSidebarStoredState("closed");
    assert.equal(readAssistantSidebarStoredState(), "closed");
  } finally {
    Object.defineProperty(globalThis, "sessionStorage", {
      configurable: true,
      value: previousStorage,
    });
  }
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
