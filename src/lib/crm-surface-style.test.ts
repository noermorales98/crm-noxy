import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import postcss from "postcss";

const projectRoot = new URL("../../", import.meta.url);

function crmStyleRules() {
  const css = readFileSync(new URL("app/globals.css", projectRoot), "utf8");
  return postcss.parse(css).nodes.filter((node) => node.type === "rule");
}

test("authenticated CRM neutral borders keep geometry without visible color", () => {
  const rule = crmStyleRules().find((candidate) =>
    candidate.selector.includes('[data-crm-theme]')
    && candidate.selector.includes('border-border-subtle'),
  );

  assert.ok(rule, "the authenticated CRM needs a scoped neutral-border policy");
  assert.equal(rule.nodes.find((node) => node.type === "decl" && node.prop === "border-color")?.value, "transparent");
  assert.equal(rule.nodes.some((node) => node.type === "decl" && node.prop === "border-width"), false);
});

test("CRM cards are rounder than controls (DESIGN.md: surface 12px, control 10px)", () => {
  const css = readFileSync(new URL("app/globals.css", projectRoot), "utf8");
  const root = postcss.parse(css);
  const theme = root.nodes.find((node) => node.type === "atrule" && node.name === "theme");
  const declarations = theme?.nodes?.filter((node) => node.type === "decl") ?? [];

  assert.equal(declarations.find((node) => node.prop === "--radius-surface")?.value, "12px");
  assert.equal(declarations.find((node) => node.prop === "--radius-control")?.value, "10px");
  assert.equal(declarations.find((node) => node.prop === "--radius-lg")?.value, "14px");
});

test("neutral outlined actions receive an opaque surface", () => {
  const rule = crmStyleRules().find((candidate) =>
    candidate.selector.includes('[data-crm-theme]')
    && candidate.selector.includes('button')
    && candidate.selector.includes('border-border-subtle'),
  );

  assert.ok(rule, "neutral buttons need a solid surface when their border is transparent");
  assert.equal(rule.nodes.find((node) => node.type === "decl" && node.prop === "background-color")?.value, "var(--surface-sidebar)");
});

test("shared public panels retain their default outline outside the CRM shell", () => {
  const css = readFileSync(new URL("app/globals.css", projectRoot), "utf8");
  const root = postcss.parse(css);
  const applyBySelector = new Map<string, string>();

  root.walkRules((rule) => {
    const apply = rule.nodes.find((node) => node.type === "atrule" && node.name === "apply");
    if (apply) applyBySelector.set(rule.selector, apply.params);
  });

  assert.match(applyBySelector.get(".crm-card") ?? "", /\bborder\s+border-border-subtle\b/);
  assert.match(applyBySelector.get(".noxy-form-panel") ?? "", /\bborder\s+border-border-subtle\b/);
});

// Ronda 2 del rediseño (marco claro): sin cristal. El fondo del compositor es sólido (sin backdrop-blur)
// y el panel usa la superficie elevada del tema.
test("email composer uses a solid backdrop (no glass) and a rounded clipped panel", () => {
  const emails = readFileSync(new URL("app/emails/page.tsx", projectRoot), "utf8");

  assert.match(emails, /Compose Modal[\s\S]*?bg-brand-obsidian\/45/);
  assert.doesNotMatch(emails, /Compose Modal[\s\S]{0,240}backdrop-blur/);
  assert.match(emails, /Compose Modal[\s\S]*?bg-surface-elevated rounded-surface overflow-hidden/);
});

test("floating menus use the structural overlay elevation without changing popup shadows", () => {
  const menuRule = crmStyleRules().find((candidate) => candidate.selector.split(",").some((selector) => selector.trim() === ".crm-floating-menu"));
  const emails = readFileSync(new URL("app/emails/page.tsx", projectRoot), "utf8");
  const crmUi = readFileSync(new URL("src/lib/crm-ui.ts", projectRoot), "utf8");

  assert.ok(menuRule, "floating menus need a dedicated elevation class");
  assert.equal(
    menuRule.nodes.find((node) => node.type === "decl" && node.prop === "box-shadow")?.value,
    "0 8px 8px rgba(11, 11, 24, 0.10)",
  );
  assert.match(emails, /contactDropdownRef[\s\S]*?crm-floating-menu/);
  assert.match(emails, /shadow-\[0_24px_70px_rgba\(11,11,24,0\.28\)\]/);
  assert.match(crmUi, /modalPanel[\s\S]*?shadow-\[0_8px_8px_rgba\(11,11,24,0\.10\)\]/);

  for (const path of [
    "src/components/PageControls.tsx",
    "src/components/NotificationsMenu.tsx",
    "src/components/kb/KbSharePanel.tsx",
    "app/assistant/[id]/_components/ModelSelector.tsx",
  ]) {
    assert.match(readFileSync(new URL(path, projectRoot), "utf8"), /crm-floating-menu/, `${path} should use the menu elevation`);
  }
});
