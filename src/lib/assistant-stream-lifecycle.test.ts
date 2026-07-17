import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Node's native TypeScript runner requires an explicit extension.
import { assistantRequestErrorMessage, beginConversationTransition, completeConversationTransition, persistBeforeClosingStream } from "./assistant-stream-lifecycle.ts";

test("a new conversation publishes its route only after the stream completes", () => {
  const pending = beginConversationTransition("new", "conversation-123");

  assert.deepEqual(pending, {
    id: "conversation-123",
    publishAfterStream: true,
  });
  assert.deepEqual(completeConversationTransition(pending), {
    url: "/assistant/conversation-123",
    notifySidebar: true,
  });

  const existing = beginConversationTransition("conversation-456");
  assert.deepEqual(completeConversationTransition(existing), null);
});

test("assistant persistence finishes before the response stream closes", async () => {
  const events: string[] = [];
  let finishPersistence: (() => void) | undefined;
  const persistence = new Promise<void>((resolve) => {
    finishPersistence = resolve;
  });

  const completion = persistBeforeClosingStream(
    async () => {
      events.push("persist:start");
      await persistence;
      events.push("persist:end");
    },
    () => events.push("close"),
  );

  await Promise.resolve();
  assert.deepEqual(events, ["persist:start"]);

  finishPersistence?.();
  await completion;
  assert.deepEqual(events, ["persist:start", "persist:end", "close"]);
});

test("a failed assistant request produces visible feedback", () => {
  assert.equal(
    assistantRequestErrorMessage(502),
    "No pude generar una respuesta en este momento. Intenta de nuevo o selecciona otro modelo. (Error 502)",
  );
});
