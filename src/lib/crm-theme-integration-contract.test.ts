import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { extname, join } from "node:path";
import test from "node:test";

const projectRoot = new URL("../../", import.meta.url);

function read(relativePath: string): string {
  return readFileSync(new URL(relativePath, projectRoot), "utf8");
}

function collectFirstPartyUi(): string {
  const files: string[] = [];

  const visit = (relativeDir: "app" | "src") => {
    const root = new URL(relativeDir, projectRoot).pathname;
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) walk(path);
        else if ([".ts", ".tsx"].includes(extname(path)) && !path.includes(".test.")) files.push(path);
      }
    };
    walk(root);
  };

  visit("app");
  visit("src");
  return files.map((file) => readFileSync(file, "utf8")).join("\n");
}

test("primary action foreground is a theme-aware semantic token", () => {
  const globals = read("app/globals.css");
  const crmUi = read("src/lib/crm-ui.ts");
  const uiSource = collectFirstPartyUi();

  assert.match(globals, /--color-action-primary-foreground:\s*#FFFFFF/i);
  assert.match(globals, /\.crm-btn-primary[\s\S]*?text-action-primary-foreground/);
  assert.match(crmUi, /bg-action-primary text-action-primary-foreground/);
  assert.doesNotMatch(uiSource, /bg-action-primary[^"'`\n]{0,220}text-white/);
  assert.doesNotMatch(uiSource, /text-white[^"'`\n]{0,220}bg-action-primary/);
});

test("public forms retain their static no-motion contract", () => {
  const publicForm = read("app/form/[id]/page.tsx");
  assert.doesNotMatch(publicForm, /\b(?:animate|transition|duration|delay|ease|scale|rotate)-/);
  assert.match(publicForm, /role="status"/);
  assert.match(publicForm, /aria-live="polite"/);
});

test("personal themes wrap only the authenticated CRM shell", () => {
  const appShell = read("src/components/AppShell.tsx");
  const dashboardShell = read("src/components/DashboardShell.tsx");
  const publicReturn = appShell.indexOf("if (isPublicRoute(pathname))");
  const provider = appShell.indexOf("<CrmThemeProvider>");

  assert.ok(publicReturn >= 0 && provider > publicReturn);
  assert.match(appShell, /<CrmThemeProvider>[\s\S]*<DashboardShell/);
  assert.match(dashboardShell, /data-crm-theme=\{themeId\}/);
  assert.match(dashboardShell, /crmThemeCssVariables\(theme\)/);
});

test("Settings exposes an accessible responsive theme selector", () => {
  const settings = read("app/settings/page.tsx");
  const selector = read("src/components/settings/ThemeSelector.tsx");

  assert.match(settings, /<ThemeSelector\s*\/>/);
  assert.match(selector, /<h2[^>]*>Apariencia<\/h2>/);
  assert.match(selector, /aria-pressed=\{selected\}/);
  assert.match(selector, /role="status"/);
  assert.match(selector, /aria-live="polite"/);
  assert.match(selector, /grid-cols-1 sm:grid-cols-2/);
  assert.match(settings, /<label[^>]*htmlFor="timezone"/);
  assert.match(settings, /<select[^>]*id="timezone"/);
});
