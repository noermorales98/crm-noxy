import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Node's native TypeScript runner requires an explicit extension.
import { CRM_THEMES, DEFAULT_CRM_THEME_ID, actionInk, actionInkHover, contrastRatio, crmThemeCssVariables, isCrmThemeId, navActiveInk, resolveCrmTheme, type CrmThemeTokens } from "./crm-themes.ts";

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

test("ships eighteen unique light themes including the requested Obsidian palette", () => {
  assert.equal(CRM_THEMES.length, 18);
  assert.equal(new Set(CRM_THEMES.map(({ id }) => id)).size, 18);
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

test("light frame pairs meet WCAG AA in every theme", () => {
  for (const theme of CRM_THEMES) {
    const { id, tokens } = theme;
    // Marco claro: texto secundario e iconos sobre el fondo del marco.
    assert.ok(contrastRatio(tokens.textSecondary, tokens.surfaceSidebar) >= 4.5, `${id}: secondary text on frame`);
    // Destino activo (escalera de acento): su tinta sobre la pastilla navActive del tema.
    const ink = navActiveInk(theme);
    assert.ok(contrastRatio(ink, tokens.navActive) >= 4.5, `${id}: active ink ${ink} on the nav-active pill`);
    // La tinta es la acción del tema cuando llega a AA sobre la pastilla; si no, el texto principal
    // (regla de pares de DESIGN.md: Azul Recuerdo y Lima siempre con Obsidiana).
    const actionPasses = contrastRatio(tokens.actionPrimary, tokens.navActive) >= 4.5;
    assert.equal(ink, actionPasses ? tokens.actionPrimary : tokens.textPrimary, `${id}: active ink choice`);
    // La tinta llega al shell como variable CSS del tema.
    assert.equal((crmThemeCssVariables(theme) as Record<string, string>)["--nav-active-ink"], ink, `${id}: --nav-active-ink`);
    // Foco visible también sobre el marco.
    assert.ok(contrastRatio(tokens.focus, tokens.surfaceSidebar) >= 3, `${id}: focus on frame`);
  }
});

test("la tinta de acción (texto, enlaces e iconos) llega a AA en todas las superficies de cada tema", () => {
  for (const theme of CRM_THEMES) {
    const { id, tokens } = theme;
    const ink = actionInk(theme);
    for (const surface of [tokens.surfaceApp, tokens.surfaceSidebar, tokens.surfaceElevated, tokens.navActive, tokens.navHover]) {
      assert.ok(contrastRatio(ink, surface) >= 4.5, `${id}: tinta ${ink} sobre ${surface} = ${contrastRatio(ink, surface).toFixed(2)}`);
    }
    // Un paso más oscura al pasar el puntero, sin perder contraste.
    assert.ok(contrastRatio(actionInkHover(theme), tokens.surfaceElevated) >= contrastRatio(ink, tokens.surfaceElevated), `${id}: hover`);
    const css = crmThemeCssVariables(theme) as Record<string, string>;
    assert.equal(css["--color-action-ink"], ink);
    assert.equal(css["--action-ink"], ink);
    assert.equal(css["--color-action-ink-hover"], actionInkHover(theme));
  }
});

test("Lima y Azul Recuerdo conservan su matiz en la tinta: oscurecen su color, no lo cambian por gris", () => {
  const lime = actionInk(resolveCrmTheme("noxy-lime"));
  const memory = actionInk(resolveCrmTheme("noxy-memory"));
  assert.notEqual(lime, "#C8FE37");
  assert.notEqual(memory, "#7F96F9");
  // Lima sigue siendo verdosa (G domina) y Recuerdo azulada (B domina).
  const [lr, lg, lb] = [1, 3, 5].map((i) => Number.parseInt(lime.slice(i, i + 2), 16));
  const [mr, mg, mb] = [1, 3, 5].map((i) => Number.parseInt(memory.slice(i, i + 2), 16));
  assert.ok(lg > lr && lg > lb);
  assert.ok(mb > mr && mb > mg);
});

test("el color de acción original sigue valiendo para botones (fondo con su texto encima)", () => {
  for (const { id, tokens } of CRM_THEMES) {
    assert.ok(contrastRatio(tokens.actionPrimaryForeground, tokens.actionPrimary) >= 4.5, `${id}: texto del botón`);
  }
});
