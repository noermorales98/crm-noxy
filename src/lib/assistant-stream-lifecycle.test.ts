import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Node's native TypeScript runner requires an explicit extension.
import { assistantRequestErrorMessage, beginConversationTransition, completeConversationTransition, createAssistantStreamOperationManager, ensureConversationTransition, persistBeforeClosingStream } from "./assistant-stream-lifecycle.ts";

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

test("starting a new stream aborts and invalidates the previous operation", () => {
  const manager = createAssistantStreamOperationManager();
  const first = manager.start();
  const second = manager.start();

  assert.equal(first.signal.aborted, true);
  assert.equal(first.isCurrent(), false);
  assert.equal(first.finish(), false);
  assert.equal(second.signal.aborted, false);
  assert.equal(second.isCurrent(), true);
  assert.equal(second.finish(), true);
  assert.equal(second.isCurrent(), false);
});

test("stopping and disposing abort active work without allowing stale side effects", () => {
  const manager = createAssistantStreamOperationManager();
  const stopped = manager.start();

  manager.abortCurrent();
  assert.equal(stopped.signal.aborted, true);
  assert.equal(stopped.isCurrent(), false);
  assert.equal(stopped.finish(), true, "the mounted owner may clear its streaming UI");

  const disposed = manager.start();
  manager.dispose();
  assert.equal(disposed.signal.aborted, true);
  assert.equal(disposed.isCurrent(), false);
  assert.equal(disposed.finish(), false, "an unmounted owner must not update state");
});

test("a disposed manager can start a fresh operation after an effect is reactivated", () => {
  const manager = createAssistantStreamOperationManager();
  manager.dispose();

  const reactivated = manager.start();

  assert.equal(reactivated.signal.aborted, false);
  assert.equal(reactivated.isCurrent(), true);
  assert.equal(reactivated.finish(), true);
});

test("conversation creation receives the active AbortSignal", async () => {
  const controller = new AbortController();
  let receivedSignal: AbortSignal | undefined;

  const transition = await ensureConversationTransition(
    "new",
    controller.signal,
    async (signal) => {
      receivedSignal = signal;
      return {
        ok: true,
        json: async () => ({ id: "created-conversation" }),
      };
    },
  );

  assert.equal(receivedSignal, controller.signal);
  assert.deepEqual(transition, {
    id: "created-conversation",
    publishAfterStream: true,
  });
});

test("existing conversations do not call the creation request", async () => {
  const controller = new AbortController();
  let calls = 0;

  const transition = await ensureConversationTransition(
    "existing-conversation",
    controller.signal,
    async () => {
      calls += 1;
      return { ok: false, json: async () => ({}) };
    },
  );

  assert.equal(calls, 0);
  assert.deepEqual(transition, {
    id: "existing-conversation",
    publishAfterStream: false,
  });
});
