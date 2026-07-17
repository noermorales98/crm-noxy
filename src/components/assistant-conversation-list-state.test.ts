import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Node's native TypeScript runner requires an explicit extension.
import { assistantConversationListReducer, INITIAL_ASSISTANT_CONVERSATION_LIST_STATE } from "./assistant-conversation-list-state.ts";

const existing = [{ id: "one", title: "Ventas de julio", updatedAt: "2026-07-16" }];

test("first load uses loading without claiming the list is empty", () => {
  assert.deepEqual(INITIAL_ASSISTANT_CONVERSATION_LIST_STATE, {
    status: "loading",
    conversations: [],
    hasSnapshot: false,
  });
});

test("refresh preserves the current conversation snapshot", () => {
  const ready = { status: "ready" as const, conversations: existing, hasSnapshot: true };
  assert.deepEqual(assistantConversationListReducer(ready, { type: "request" }), {
    status: "refreshing",
    conversations: existing,
    hasSnapshot: true,
  });
});

test("refreshing a legitimately empty ready list does not return to initial loading", () => {
  const ready = { status: "ready" as const, conversations: [], hasSnapshot: true };
  assert.deepEqual(assistantConversationListReducer(ready, { type: "request" }), {
    status: "refreshing",
    conversations: [],
    hasSnapshot: true,
  });
});

test("refresh errors preserve the previous snapshot", () => {
  const refreshing = { status: "refreshing" as const, conversations: existing, hasSnapshot: true };
  assert.deepEqual(assistantConversationListReducer(refreshing, { type: "error" }), {
    status: "error",
    conversations: existing,
    hasSnapshot: true,
  });
});

test("successful requests replace the snapshot", () => {
  const next = [{ id: "two", title: "Seguimiento", updatedAt: "2026-07-17" }];
  assert.deepEqual(
    assistantConversationListReducer(INITIAL_ASSISTANT_CONVERSATION_LIST_STATE, {
      type: "success",
      conversations: next,
    }),
    { status: "ready", conversations: next, hasSnapshot: true },
  );
});

test("retrying an initial error returns to loading instead of showing an empty history", () => {
  const failedInitialLoad = {
    status: "error" as const,
    conversations: [],
    hasSnapshot: false,
  };

  assert.deepEqual(assistantConversationListReducer(failedInitialLoad, { type: "request" }), {
    status: "loading",
    conversations: [],
    hasSnapshot: false,
  });
});

test("retrying after a successful empty snapshot remains a background refresh", () => {
  const failedRefresh = {
    status: "error" as const,
    conversations: [],
    hasSnapshot: true,
  };

  assert.deepEqual(assistantConversationListReducer(failedRefresh, { type: "request" }), {
    status: "refreshing",
    conversations: [],
    hasSnapshot: true,
  });
});
