import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Node's native TypeScript runner requires an explicit extension.
import { createAbortableRequestLifecycle, createReplaceableTimer, getDialogTabTarget, resolveMessageBubblePresentation } from "./message-bubble-behavior.ts";

test("message bubbles keep the global presentation unless soft cards are requested", () => {
  assert.equal(resolveMessageBubblePresentation(undefined), "default");
  assert.equal(resolveMessageBubblePresentation("default"), "default");
  assert.equal(resolveMessageBubblePresentation("soft-card"), "soft-card");
});

test("dialog focus wraps forward and backward within its controls", () => {
  const controls = ["close", "link", "footer"] as const;

  assert.equal(getDialogTabTarget(controls, "footer", false), "close");
  assert.equal(getDialogTabTarget(controls, "close", true), "footer");
  assert.equal(getDialogTabTarget(controls, "link", false), null);
  assert.equal(getDialogTabTarget(controls, null, false), "close");
  assert.equal(getDialogTabTarget(controls, null, true), "footer");
});

test("copy reset timer replaces an earlier timeout and clears on dispose", () => {
  const callbacks = new Map<number, () => void>();
  const cleared: number[] = [];
  let nextId = 0;
  const timer = createReplaceableTimer(
    (callback) => {
      nextId += 1;
      callbacks.set(nextId, callback);
      return nextId;
    },
    (id) => {
      cleared.push(id);
      callbacks.delete(id);
    },
  );

  timer.schedule(() => undefined, 2_000);
  timer.schedule(() => undefined, 2_000);
  assert.deepEqual(cleared, [1]);

  timer.dispose();
  assert.deepEqual(cleared, [1, 2]);
  assert.equal(callbacks.size, 0);
});

test("a disposed copy reset timer cannot schedule work after unmount", () => {
  const callbacks = new Map<number, () => void>();
  let nextId = 0;
  const timer = createReplaceableTimer(
    (callback) => {
      nextId += 1;
      callbacks.set(nextId, callback);
      return nextId;
    },
    (id) => callbacks.delete(id),
  );

  timer.dispose();
  timer.schedule(() => undefined, 2_000);

  assert.equal(callbacks.size, 0);
});

test("model request lifecycle aborts active work and blocks post-unmount updates", () => {
  const lifecycle = createAbortableRequestLifecycle();
  const request = lifecycle.start();

  lifecycle.dispose();

  assert.equal(request.signal.aborted, true);
  assert.equal(request.isCurrent(), false);
  assert.equal(request.finish(), false);
});

test("a newer model request invalidates the previous response", () => {
  const lifecycle = createAbortableRequestLifecycle();
  const first = lifecycle.start();
  const second = lifecycle.start();

  assert.equal(first.signal.aborted, true);
  assert.equal(first.isCurrent(), false);
  assert.equal(second.isCurrent(), true);
  assert.equal(second.finish(), true);
});
