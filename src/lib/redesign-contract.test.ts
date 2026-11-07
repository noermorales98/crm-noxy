import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

// Contrato del rediseño «marco claro» (spec rediseno-obsidiana-estructural, T001).
const projectRoot = new URL("../../", import.meta.url);
const read = (relativePath: string) => readFileSync(new URL(relativePath, projectRoot), "utf8");

type CssRule = { selector: string; body: string; media: string };

/** Splits a stylesheet into flat rules, remembering the enclosing @media (one level deep). */
function cssRules(css: string): CssRule[] {
  const rules: CssRule[] = [];
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, "");
  let i = 0;
  const stack: string[] = [];
  let selectorStart = 0;
  while (i < clean.length) {
    const ch = clean[i];
    if (ch === "{") {
      const head = clean.slice(selectorStart, i).trim();
      const close = findBlockEnd(clean, i);
      const inner = clean.slice(i + 1, close);
      if (head.startsWith("@media") || head.startsWith("@layer") || head.startsWith("@supports")) {
        stack.push(head);
        rules.push(...cssRules(inner).map((rule) => ({ ...rule, media: [head, rule.media].filter(Boolean).join(" ") })));
        stack.pop();
      } else {
        rules.push({ selector: head, body: inner, media: "" });
      }
      i = close + 1;
      selectorStart = i;
      continue;
    }
    if (ch === "}" || ch === ";") selectorStart = i + 1;
    i++;
  }
  return rules;
}

function findBlockEnd(css: string, open: number): number {
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === "{") depth++;
    else if (css[i] === "}") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return css.length - 1;
}

const globals = read("app/globals.css");
const rules = cssRules(globals);
// Los temas editoriales de Docs (kb-*) son contenido elegido por el usuario y quedan fuera del alcance.
const chromeRules = rules.filter((rule) => !/\.kb-/.test(rule.selector));

const ruleBody = (selector: string) => {
  const rule = rules.find((r) => r.selector === selector && !r.media);
  assert.ok(rule, `${selector} block exists`);
  return rule.body;
};
const px = (body: string, name: string) => {
  const match = body.match(new RegExp(`${name}:\\s*(\\d+)ms`));
  assert.ok(match, `${name} declared in ms`);
  return Number(match[1]);
};
const declaredProps = (block: string) =>
  [...block.matchAll(/([a-z-]+)\s*:/g)].map((m) => m[1]).filter((prop) => !prop.startsWith("--"));

test("radius tokens follow DESIGN.md: control 10px, surface 12px, none above 16px", () => {
  for (const scope of ["@theme", ":root"]) {
    const body = ruleBody(scope);
    assert.match(body, /--radius-control:\s*10px;/, `${scope} --radius-control`);
    assert.match(body, /--radius-surface:\s*12px;/, `${scope} --radius-surface`);
    for (const [, name, value] of body.matchAll(/(--radius-[\w-]+):\s*(\d+)px/g)) {
      assert.ok(Number(value) <= 16, `${scope} ${name} = ${value}px > 16px`);
    }
  }
});

test("no glassmorphism remains in the CRM chrome", () => {
  for (const rule of rules) {
    assert.doesNotMatch(rule.selector, /\.crm-glass(?:-[\w-]+)?\b/, `glass class ${rule.selector}`);
  }
  for (const rule of chromeRules) {
    assert.doesNotMatch(rule.body, /backdrop-filter/, `backdrop-filter in ${rule.selector}`);
  }
});

test("shadows are limited to the structural overlay (blur <= 8px)", () => {
  for (const rule of chromeRules) {
    for (const [, value] of rule.body.matchAll(/box-shadow:\s*([^;]+)/g)) {
      for (const layer of value.split(/,(?![^(]*\))/)) {
        if (/^\s*(none|inset\b)/.test(layer) || /\binset\b/.test(layer)) continue;
        const lengths = layer
          .replace(/(rgba?|hsla?|var|color-mix)\([^)]*\)/g, "")
          .trim()
          .split(/\s+/)
          .filter((part) => /^-?\d*\.?\d+(px)?$/.test(part));
        const blur = lengths.length >= 3 ? parseFloat(lengths[2]) : 0;
        assert.ok(blur <= 8, `${rule.selector}: shadow blur ${blur}px > 8px`);
      }
    }
  }
  const menus = chromeRules.find((rule) => rule.selector.includes(".crm-floating-menu"));
  assert.ok(menus, "floating menu rule exists");
  assert.match(menus.body, /box-shadow:\s*0 8px 8px rgba\(11,\s*11,\s*24,\s*0?\.10?\)/);
});

test("entry motion is tokenised, bounded under 500ms and gated by reduced-motion", () => {
  const root = ruleBody(":root");
  const duration = px(root, "--duration-enter");
  const stagger = px(root, "--stagger");
  // Hasta 6 bloques por pantalla (índices 0-5): la secuencia completa dura menos de 500 ms.
  assert.ok(duration + 5 * stagger < 500, `entry sequence ${duration}+5×${stagger}ms must stay < 500ms`);

  const enter = rules.filter((rule) => /\.crm-enter\b/.test(rule.selector));
  assert.ok(enter.length > 0, ".crm-enter rule exists");
  for (const rule of enter) {
    assert.match(rule.media, /prefers-reduced-motion:\s*no-preference/, `${rule.selector} must be gated`);
    assert.match(rule.body, /var\(--duration-enter\)/, "uses the duration token");
    assert.match(rule.body, /var\(--stagger\)/, "uses the stagger token");
  }

  const keyframes = globals.match(/@keyframes\s+crm-enter\s*\{([\s\S]*?\})\s*\}/);
  assert.ok(keyframes, "@keyframes crm-enter exists");
  for (const prop of declaredProps(keyframes[1])) {
    assert.ok(["opacity", "transform"].includes(prop), `keyframes animate only transform/opacity, found ${prop}`);
  }
});

test("hover lift and press feedback exist and are gated by reduced-motion", () => {
  for (const [cls, pseudo, move] of [
    [".crm-lift", ":hover", "translateY(-1px)"],
    [".crm-press", ":active", "translateY(1px)"],
  ] as const) {
    const rule = rules.find((r) => r.selector.includes(`${cls}${pseudo}`));
    assert.ok(rule, `${cls}${pseudo} rule exists`);
    assert.match(rule.media, /prefers-reduced-motion:\s*no-preference/, `${cls} must be gated`);
    assert.ok(rule.body.includes(move), `${cls}${pseudo} moves ${move}`);
  }
});

const section = (doc: string, heading: RegExp) => {
  const start = doc.search(heading);
  assert.ok(start >= 0, `section ${heading} exists`);
  const rest = doc.slice(start).split("\n").slice(1).join("\n");
  const end = rest.search(/^## /m);
  return end === -1 ? rest : rest.slice(0, end);
};

test("DESIGN.md documents the light frame, expressive motion and its amendment", () => {
  const design = read("DESIGN.md");
  const frame = section(design, /^## Marco claro\s*$/m);
  assert.ok(frame.trim().length > 200, "«Marco claro» section has content");
  assert.match(frame, /Lavanda|surface-sidebar/, "frame colour is documented");
  assert.match(frame, /hoja/i, "content sheet is documented");
  assert.match(design, /rounded:\s*\n\s*control:\s*"10px"\s*\n\s*surface:\s*"12px"/);
  assert.doesNotMatch(design, /secuencias de entrada al cargar/, "old no-entry rule is amended");
  const donts = design.split("\n").filter((line) => /\*\*Don't\*\*/.test(line));
  assert.ok(!donts.some((line) => /escalonad/i.test(line)), "staggered entries are not banned in Don'ts");
  assert.match(design, /entradas? escalonadas?/i, "expressive motion rule");
  const log = section(design, /^## Registro de enmiendas\s*$/m);
  assert.match(log, /2026-11-05/, "amendment dated in the log");
  assert.match(log, /marco claro/i, "log names the light frame");
});

test("PRODUCT.md describes the light frame and expressive motion", () => {
  const product = read("PRODUCT.md");
  assert.match(product, /marco claro/i, "light frame named");
  assert.match(product, /5\. \*\*[^*]+\*\*[^\n]*entradas? escalonadas?/i, "principle 5 allows staggered entries");
  assert.match(product, /\/form\/:id/, "public form keeps its no-motion rule");
});
