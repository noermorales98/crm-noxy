import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Node's native TypeScript runner requires an explicit extension.
import {
  ASSISTANT_SIDEBAR_MODE_STORAGE_KEY,
  INITIAL_ASSISTANT_SIDEBAR_STATE,
  assistantNewSidebarReducer,
  getSidebarFocusTarget,
  isAssistantRoute,
  isAssistantSidebarVisible,
  readAssistantSidebarStoredMode,
  writeAssistantSidebarStoredMode,
} from "./assistant-new-sidebar-state.ts";

test("floating sidebar is available on supported assistant routes", () => {
  assert.equal(isAssistantRoute("/assistant"), true);
  assert.equal(isAssistantRoute("/assistant/new"), true);
  assert.equal(isAssistantRoute("/assistant/conversation-123"), true);
  assert.equal(isAssistantRoute("/assistant/conversation-123/extra"), false);
  assert.equal(isAssistantRoute("/contacts"), false);
});

test("assistant sidebar supports pin, unpin, and peek actions", () => {
  assert.deepEqual(assistantNewSidebarReducer(INITIAL_ASSISTANT_SIDEBAR_STATE, { type: "peekOpen" }), {
    mode: "auto",
    peek: true,
  });
  assert.deepEqual(
    assistantNewSidebarReducer({ mode: "auto", peek: true }, { type: "peekClose" }),
    { mode: "auto", peek: false },
  );
  assert.deepEqual(assistantNewSidebarReducer({ mode: "auto", peek: true }, { type: "pin" }), {
    mode: "pinned",
    peek: false,
  });
  assert.deepEqual(assistantNewSidebarReducer({ mode: "pinned", peek: false }, { type: "unpin" }), {
    mode: "auto",
    peek: false,
  });
  assert.deepEqual(assistantNewSidebarReducer({ mode: "pinned", peek: false }, { type: "peekClose" }), {
    mode: "pinned",
    peek: false,
  });
  assert.deepEqual(assistantNewSidebarReducer({ mode: "auto", peek: true }, { type: "navigate" }), {
    mode: "auto",
    peek: true,
  });
  assert.deepEqual(assistantNewSidebarReducer({ mode: "auto", peek: false }, { type: "mobileOpen" }), {
    mode: "auto",
    peek: true,
  });
});

test("assistant sidebar visibility follows pin or peek", () => {
  assert.equal(isAssistantSidebarVisible({ mode: "auto", peek: false }), false);
  assert.equal(isAssistantSidebarVisible({ mode: "auto", peek: true }), true);
  assert.equal(isAssistantSidebarVisible({ mode: "pinned", peek: false }), true);
});

test("assistant sidebar session storage restores and persists mode", () => {
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
    assert.equal(readAssistantSidebarStoredMode(), "auto");
    writeAssistantSidebarStoredMode("pinned");
    assert.equal(memory.get(ASSISTANT_SIDEBAR_MODE_STORAGE_KEY), "pinned");
    assert.equal(readAssistantSidebarStoredMode(), "pinned");
    writeAssistantSidebarStoredMode("auto");
    assert.equal(readAssistantSidebarStoredMode(), "auto");
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
