import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Node's native TypeScript runner requires an explicit extension.
import { createAssistantConversationLoader } from "./assistant-conversation-loader.ts";
import type {
  AiConversation,
  AssistantConversationListAction,
} from "./assistant-conversation-list-state";

const conversations: AiConversation[] = [
  { id: "one", title: "Ventas", updatedAt: "2026-07-17" },
];

test("a newer history refresh aborts and suppresses the previous response", async () => {
  const actions: AssistantConversationListAction[] = [];
  const pending: Array<{
    signal: AbortSignal;
    resolve: (value: AiConversation[]) => void;
  }> = [];
  const loader = createAssistantConversationLoader(
    (action) => actions.push(action),
    (signal) => new Promise((resolve) => pending.push({ signal, resolve })),
  );

  const first = loader.refresh();
  const second = loader.refresh();

  assert.equal(pending[0].signal.aborted, true);
  pending[0].resolve([{ id: "stale", title: "Anterior", updatedAt: "2026-07-16" }]);
  pending[1].resolve(conversations);
  await Promise.all([first, second]);

  assert.deepEqual(actions, [
    { type: "request" },
    { type: "request" },
    { type: "success", conversations },
  ]);
});

test("history load errors dispatch feedback while aborted requests stay silent", async () => {
  const actions: AssistantConversationListAction[] = [];
  const loader = createAssistantConversationLoader(
    (action) => actions.push(action),
    async () => { throw new Error("network unavailable"); },
  );

  await loader.refresh();

  assert.deepEqual(actions, [{ type: "request" }, { type: "error" }]);
});

test("disposing history loading aborts work and prevents stale state updates", async () => {
  const actions: AssistantConversationListAction[] = [];
  let resolveRequest: ((value: AiConversation[]) => void) | undefined;
  let requestSignal: AbortSignal | undefined;
  const loader = createAssistantConversationLoader(
    (action) => actions.push(action),
    (signal) => {
      requestSignal = signal;
      return new Promise((resolve) => { resolveRequest = resolve; });
    },
  );

  const request = loader.refresh();
  loader.dispose();
  resolveRequest?.(conversations);
  await request;

  assert.equal(requestSignal?.aborted, true);
  assert.deepEqual(actions, [{ type: "request" }]);
});
