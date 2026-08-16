import assert from "node:assert/strict";
import test from "node:test";
import {
  CRM_THEMES,
  DEFAULT_CRM_THEME_ID,
  contrastRatio,
  crmThemeCssVariables,
  isCrmThemeId,
  resolveCrmTheme,
  type CrmThemeTokens,
} from "./crm-themes.ts";

const TOKEN_KEYS: Array<keyof CrmThemeTokens> = [
  "surfaceApp",
  "surfaceSidebar",
  "surfaceElevated",
  "textPrimary",
  "textSecondary",
  "textPlaceholder",
  "navActive",
  "navHover",
  "borderSubtle",
  "actionPrimary",
  "actionPrimaryForeground",
  "actionSecondary",
  "focus",
  "highlight",
];

test("ships ten unique light themes including the requested Obsidian palette", () => {
  assert.equal(CRM_THEMES.length, 10);
  assert.equal(new Set(CRM_THEMES.map(({ id }) => id)).size, 10);
  assert.ok(CRM_THEMES.every(({ isDark }) => isDark === false));

  const obsidian = resolveCrmTheme("noxy-obsidian");
  assert.equal(obsidian.tokens.actionPrimary, "#0B0B18");
  assert.equal(obsidian.tokens.surfaceApp, "#FFFFFF");
});

test("validates stable identifiers and resolves unknown values to Noxy Indigo", () => {
  assert.equal(DEFAULT_CRM_THEME_ID, "noxy-indigo");
  assert.equal(isCrmThemeId("noxy-lime"), true);
  assert.equal(isCrmThemeId("dark"), false);
  assert.equal(isCrmThemeId(null), false);
  assert.equal(resolveCrmTheme("removed-theme").id, DEFAULT_CRM_THEME_ID);
});

test("every theme exposes the complete semantic token contract and CSS variables", () => {
  for (const theme of CRM_THEMES) {
    for (const key of TOKEN_KEYS) {
      assert.match(theme.tokens[key], /^#[0-9A-F]{6}$/i, `${theme.id}.${key}`);
    }
    assert.equal(theme.swatches.length, 4, `${theme.id} should expose four preview swatches`);

    const css = crmThemeCssVariables(theme);
    assert.equal(css["--color-surface-app"], theme.tokens.surfaceApp);
    assert.equal(css["--surface-app"], theme.tokens.surfaceApp);
    assert.equal(css["--color-action-primary-foreground"], theme.tokens.actionPrimaryForeground);
    assert.equal(css["--action-primary-foreground"], theme.tokens.actionPrimaryForeground);
  }
});

test("theme text and primary actions meet WCAG AA contrast", () => {
  for (const { id, tokens } of CRM_THEMES) {
    for (const surface of [tokens.surfaceApp, tokens.surfaceSidebar, tokens.surfaceElevated]) {
      assert.ok(contrastRatio(tokens.textPrimary, surface) >= 4.5, `${id}: primary text on ${surface}`);
    }
    for (const surface of [tokens.surfaceApp, tokens.surfaceElevated]) {
      assert.ok(contrastRatio(tokens.textSecondary, surface) >= 4.5, `${id}: secondary text on ${surface}`);
    }
    for (const action of [tokens.actionPrimary, tokens.actionSecondary]) {
      assert.ok(
        contrastRatio(tokens.actionPrimaryForeground, action) >= 4.5,
        `${id}: primary foreground on ${action}`,
      );
    }
    assert.ok(contrastRatio(tokens.focus, tokens.surfaceElevated) >= 3, `${id}: focus indicator`);
  }
});
