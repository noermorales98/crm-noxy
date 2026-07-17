import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const inputSource = readFileSync(new URL("./ChatInput.tsx", import.meta.url), "utf8");
const bubbleSource = readFileSync(new URL("./MessageBubble.tsx", import.meta.url), "utf8");
const viewSource = readFileSync(new URL("./ChatView.tsx", import.meta.url), "utf8");

test("existing chats use the approved simplified composer", () => {
  assert.match(inputSource, /AnimatedSendButton/);
  assert.doesNotMatch(inputSource, /preferredKey|onKeyChange|K\{preferredKey\}/);
  assert.match(inputSource, /ModelSelector/);
  assert.match(inputSource, /Detener generación/);
});

test("the redesign preserves message capabilities", () => {
  assert.match(bubbleSource, /ReactMarkdown/);
  assert.match(bubbleSource, /ActionCard/);
  assert.match(bubbleSource, /openRetry/);
  assert.match(bubbleSource, /handleCopy/);
  assert.match(bubbleSource, /setFullscreen/);
  assert.match(viewSource, /PixelGrid/);
});
