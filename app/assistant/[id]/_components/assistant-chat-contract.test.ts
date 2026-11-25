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
  assert.match(bubbleSource, /ActionBlock/);
  assert.match(bubbleSource, /openRetry/);
  assert.match(bubbleSource, /handleCopy/);
  assert.match(bubbleSource, /setFullscreen/);
  assert.doesNotMatch(viewSource, /PixelGrid/);
  assert.match(viewSource, /presentation="soft-card"/);
});

test("the fullscreen response has modal semantics", () => {
  assert.match(bubbleSource, /role="dialog"/);
  assert.match(bubbleSource, /aria-modal="true"/);
  assert.match(bubbleSource, /aria-label="Respuesta del asistente en pantalla completa"/);
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

// Contraste WCAG entre dos colores #RRGGBB.
function contrast(a: string, b: string): number {
  const lum = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
const CHAT_BG = "#FAFBFC";
/** Valor de una propiedad en cualquier bloque de la regla con ese selector (puede repetirse o ir agrupado). */
function ruleProp(selector: string, prop: string): string | undefined {
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const blocks = new RegExp(`(?:^|\\n)${esc}\\s*(?:,[^{]*)?\\{([^}]*)\\}`, "g");
  for (const m of chatStyles.matchAll(blocks)) {
    const v = new RegExp(`${prop}:\\s*([^;]+);`).exec(m[1])?.[1].trim();
    if (v) return v;
  }
  return undefined;
}

test("portaled and retry controls retain scoped accessibility styles", () => {
  assert.match(
    chatStyles,
    /\.fullscreen(?:Backdrop|Card)\s*\{[^}]*font-family:\s*"Open Sauce Two"/,
  );
  assert.match(
    chatStyles,
    /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.fullscreenBackdrop/,
  );
  assert.match(bubbleSource, /styles\.retryOption/);
  // El foco visible existe y su color contrasta al menos 3:1 con el fondo (WCAG 1.4.11).
  const focus = /\.retryOption:focus-visible[^{]*\{[^}]*outline:\s*\d+px solid (#[0-9A-Fa-f]{6})/.exec(chatStyles)?.[1];
  assert.ok(focus, "falta el contorno de foco de .retryOption");
  assert.ok(contrast(focus, CHAT_BG) >= 3, `foco con poco contraste: ${contrast(focus, CHAT_BG).toFixed(2)}`);
});

test("soft-card metadata keeps readable contrast and accessible targets", () => {
  // Texto secundario: al menos 4.5:1 sobre el fondo del chat (WCAG 1.4.3).
  for (const selector of [".emptyCopy", ".disclaimer", ".metaLabel", ".metaButton", ".iconButton"]) {
    const color = ruleProp(selector, "color");
    assert.match(color ?? "", /^#[0-9A-Fa-f]{6}$/, `${selector} sin color fijo`);
    assert.ok(contrast(color!, CHAT_BG) >= 4.5, `${selector} con poco contraste: ${contrast(color!, CHAT_BG).toFixed(2)}`);
  }
  // Botones con zona táctil de al menos 24 px (WCAG 2.5.8).
  for (const selector of [".metaButton", ".iconButton"]) {
    assert.ok(parseInt(ruleProp(selector, "min-height") ?? "0", 10) >= 24, `${selector} min-height < 24px`);
    assert.ok(parseInt(ruleProp(selector, "min-width") ?? "0", 10) >= 24, `${selector} min-width < 24px`);
  }
});
