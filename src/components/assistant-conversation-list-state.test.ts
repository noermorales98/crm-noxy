import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Node's native TypeScript runner requires an explicit extension.
import { assistantConversationListReducer, INITIAL_ASSISTANT_CONVERSATION_LIST_STATE } from "./assistant-conversation-list-state.ts";

const existing = [{ id: "one", title: "Ventas de julio", updatedAt: "2026-07-16" }];

test("first load uses loading without claiming the list is empty", () => {
  assert.deepEqual(INITIAL_ASSISTANT_CONVERSATION_LIST_STATE, {
    status: "loading",
    conversations: [],
  });
});

test("refresh preserves the current conversation snapshot", () => {
  const ready = { status: "ready" as const, conversations: existing };
  assert.deepEqual(assistantConversationListReducer(ready, { type: "request" }), {
    status: "refreshing",
    conversations: existing,
  });
});

test("refreshing a legitimately empty ready list does not return to initial loading", () => {
  const ready = { status: "ready" as const, conversations: [] };
  assert.deepEqual(assistantConversationListReducer(ready, { type: "request" }), {
    status: "refreshing",
    conversations: [],
  });
});

test("refresh errors preserve the previous snapshot", () => {
  const refreshing = { status: "refreshing" as const, conversations: existing };
  assert.deepEqual(assistantConversationListReducer(refreshing, { type: "error" }), {
    status: "error",
    conversations: existing,
  });
});

test("successful requests replace the snapshot", () => {
  const next = [{ id: "two", title: "Seguimiento", updatedAt: "2026-07-17" }];
  assert.deepEqual(
    assistantConversationListReducer(INITIAL_ASSISTANT_CONVERSATION_LIST_STATE, {
      type: "success",
      conversations: next,
    }),
    { status: "ready", conversations: next },
  );
});
