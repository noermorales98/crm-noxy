import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const inputSource = readFileSync(new URL("./ChatInput.tsx", import.meta.url), "utf8");
const bubbleSource = readFileSync(new URL("./MessageBubble.tsx", import.meta.url), "utf8");
const viewSource = readFileSync(new URL("./ChatView.tsx", import.meta.url), "utf8");
const chatStyles = readFileSync(new URL("../assistant-chat.module.css", import.meta.url), "utf8");
const newExperienceStyles = readFileSync(
  new URL("../../new/assistant-new.module.css", import.meta.url),
  "utf8",
);

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

test("the animated send button owns its styles in every assistant experience", () => {
  for (const className of [
    "sendButton",
    "sendHalo",
    "sendFallbackBorder",
    "sendRing",
    "sendInner",
    "sendDots",
    "sendShine",
    "arrowRest",
    "arrowCycle",
    "arrowOutgoing",
    "arrowIncoming",
  ]) {
    assert.match(newExperienceStyles, new RegExp(`(?:^|\\n)\\.${className}(?:[\\s,:.{]|$)`));
    assert.doesNotMatch(newExperienceStyles, new RegExp(`\\.experience\\s+\\.${className}`));
  }
  assert.doesNotMatch(chatStyles, /\.sendControl[^\n{]*nth-child|\.sendControl[^\n{]*>\s*span/);
});

test("portaled and retry controls retain scoped accessibility styles", () => {
  assert.match(
    chatStyles,
    /\.fullscreen(?:Backdrop|Card)\s*\{[^}]*font-family:\s*"Google Sans Flex Variable"/,
  );
  assert.match(
    chatStyles,
    /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.fullscreenBackdrop/,
  );
  assert.match(bubbleSource, /styles\.retryOption/);
  assert.match(chatStyles, /\.retryOption:focus-visible[\s\S]*#2563A9/);
});
