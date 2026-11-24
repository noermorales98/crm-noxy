import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error: node --test carga el .ts directo
import { DEFAULT_APPEARANCE, RADII, parseAppearance, radiusVars, serializeAppearance } from "./appearance.ts";
// @ts-expect-error: node --test carga el .ts directo
import { appearanceStyleSheet, borderVars, darkPaletteOverrides, frameVars } from "./appearance-css.ts";
// @ts-expect-error: node --test carga el .ts directo
import { CRM_THEMES, actionInk, contrastRatio, darkTheme, navActiveInk, resolveCrmTheme } from "./crm-themes.ts";

test("parseAppearance: ida y vuelta, y basura vuelve al valor por defecto", () => {
  const a = { mode: "dark", radius: "round", borders: "none" } as const;
  assert.deepEqual(parseAppearance(serializeAppearance(a)), a);
  assert.deepEqual(parseAppearance(null), DEFAULT_APPEARANCE);
  assert.deepEqual(parseAppearance("%7Bno"), DEFAULT_APPEARANCE);
  assert.deepEqual(parseAppearance(JSON.stringify({ mode: "neón", radius: 5, borders: "x" })), DEFAULT_APPEARANCE);
  assert.deepEqual(parseAppearance(JSON.stringify({ mode: "auto" })), { ...DEFAULT_APPEARANCE, mode: "auto" });
});

test("los radios van de cuadrado a redondo y escriben las tres variables", () => {
  assert.ok(RADII.sharp.surface < RADII.soft.surface && RADII.soft.surface < RADII.normal.surface && RADII.normal.surface < RADII.round.surface);
  assert.deepEqual(radiusVars("normal"), { "--radius-control": "10px", "--radius-surface": "12px", "--radius-ui": "12px" });
  assert.equal(radiusVars("sharp")["--radius-control"], "2px");
});

test("cada tema tiene variante oscura con contraste AA (texto, secundario, tinta de acción, botón, foco)", () => {
  for (const light of CRM_THEMES) {
    const t = darkTheme(light);
    const k = t.tokens;
    assert.equal(t.isDark, true);
    for (const s of [k.surfaceApp, k.surfaceSidebar, k.surfaceElevated, k.navActive, k.navHover]) {
      assert.ok(contrastRatio(k.textPrimary, s) >= 4.5, `${light.id}: texto sobre ${s}`);
      assert.ok(contrastRatio(k.textSecondary, s) >= 4.5, `${light.id}: secundario sobre ${s}`);
      assert.ok(contrastRatio(actionInk(t), s) >= 4.5, `${light.id}: tinta de acción sobre ${s}`);
      assert.ok(contrastRatio(k.focus, s) >= 3, `${light.id}: foco sobre ${s}`);
    }
    assert.ok(contrastRatio(k.actionPrimaryForeground, k.actionPrimary) >= 4.5, `${light.id}: texto del botón`);
    assert.ok(contrastRatio(navActiveInk(t), k.navActive) >= 4.5, `${light.id}: tinta del activo`);
  }
});

test("el modo oscuro conserva el matiz del tema (Lima sigue verdosa, Océano azul verdoso)", () => {
  const lime = darkTheme(resolveCrmTheme("noxy-lime")).tokens.actionPrimary;
  const [r, g, b] = [1, 3, 5].map((i) => Number.parseInt(lime.slice(i, i + 2), 16));
  assert.ok(g > b && g >= r);
  assert.notEqual(darkTheme(resolveCrmTheme("noxy-ocean")).tokens.surfaceApp, darkTheme(resolveCrmTheme("noxy-lime")).tokens.surfaceApp);
});

test("bordes: normal usa el del tema, suaves se funden con la tarjeta y «sin bordes» los quita", () => {
  const theme = resolveCrmTheme("noxy-indigo");
  assert.equal(borderVars(theme, "normal")["--color-border-subtle"], theme.tokens.borderSubtle);
  assert.equal(borderVars(theme, "none")["--color-border-subtle"], "transparent");
  const soft = borderVars(theme, "soft")["--color-border-subtle"];
  assert.notEqual(soft, theme.tokens.borderSubtle);
  assert.ok(contrastRatio(soft, theme.tokens.surfaceElevated) < contrastRatio(theme.tokens.borderSubtle, theme.tokens.surfaceElevated));
});

test("frameVars: en oscuro fijo usa la variante oscura; en claro y automático, la clara (automático cambia por CSS)", () => {
  const base = resolveCrmTheme("noxy-indigo");
  const dark = frameVars(base, { mode: "dark", radius: "normal", borders: "normal" });
  const light = frameVars(base, { mode: "light", radius: "normal", borders: "normal" });
  const auto = frameVars(base, { mode: "auto", radius: "normal", borders: "normal" });
  assert.notEqual(dark["--color-surface-app"], light["--color-surface-app"]);
  assert.equal(auto["--color-surface-app"], light["--color-surface-app"]);
  assert.equal(dark["--radius-surface"], "12px");
});

test("appearanceStyleSheet: claro sin nada extra; oscuro fijo y automático con ajustes; sin bordes con sombra", () => {
  const base = resolveCrmTheme("noxy-indigo");
  assert.equal(appearanceStyleSheet(base, { mode: "light", radius: "normal", borders: "normal" }), "");
  const dark = appearanceStyleSheet(base, { mode: "dark", radius: "normal", borders: "normal" });
  assert.match(dark, /color-scheme:dark/);
  assert.match(dark, /\.bg-white\{background-color:var\(--color-surface-elevated\)\}/);
  const auto = appearanceStyleSheet(base, { mode: "auto", radius: "normal", borders: "normal" });
  assert.match(auto, /@media \(prefers-color-scheme: dark\)/);
  assert.match(auto, /--color-surface-app:#[0-9A-Fa-f]{6} !important/);
  assert.match(appearanceStyleSheet(base, { mode: "light", radius: "normal", borders: "none" }), /box-shadow/);
});

test("los pasteles de Tailwind pasan a fondos traslúcidos y textos claros en oscuro", () => {
  const css = darkPaletteOverrides(".x");
  assert.match(css, /\.bg-green-50,\.bg-green-100\)\{background-color:rgba\(34,197,94,0\.16\)\}/);
  assert.match(css, /\.text-red-500/);
});

test("con un radio distinto del normal, las esquinas escritas a mano siguen el radio elegido", () => {
  const base = resolveCrmTheme("noxy-indigo");
  const sharp = appearanceStyleSheet(base, { mode: "light", radius: "sharp", borders: "normal" });
  assert.match(sharp, /html\[data-crm-radius\] :is\(\.rounded-md,\.rounded-lg\)\{border-radius:var\(--radius-control\)\}/);
  assert.match(sharp, /\.rounded-xl,\.rounded-2xl,\.rounded-3xl\)\{border-radius:var\(--radius-surface\)\}/);
  assert.equal(appearanceStyleSheet(base, { mode: "light", radius: "normal", borders: "normal" }), "", "el radio normal no toca nada");
});
