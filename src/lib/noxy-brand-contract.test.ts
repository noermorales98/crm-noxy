import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { extname, join } from "node:path";
import test from "node:test";

const projectRoot = new URL("../../", import.meta.url);

function read(relativePath: string): string {
  return readFileSync(new URL(relativePath, projectRoot), "utf8");
}

function collectUiSources(relativeDir: "app" | "src"): string {
  const rootPath = new URL(relativeDir, projectRoot).pathname;
  const files: string[] = [];

  const visit = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) visit(path);
      else if ([".ts", ".tsx", ".css"].includes(extname(path)) && !path.includes(".test.")) files.push(path);
    }
  };

  visit(rootPath);
  return files.map((file) => readFileSync(file, "utf8")).join("\n");
}

test("global theme exposes the complete Noxy palette and accessible semantic roles", () => {
  const globals = read("app/globals.css");

  for (const [token, color] of Object.entries({
    "brand-memory": "#7F96F9",
    "brand-discord": "#5363EE",
    "brand-indigo": "#3545D6",
    "brand-obsidian": "#0B0B18",
    "brand-lime": "#C8FE37",
    "brand-jasmine": "#F5F6FB",
    "brand-lavender": "#EBEDFA",
    "brand-silver": "#9CA3B7",
    "brand-gray": "#6B7184",
    "text-secondary-strong": "#555B6E",
    "border-subtle": "#DCDFE6",
  })) {
    assert.match(globals, new RegExp(`--color-${token}:\\s*${color}`, "i"), `${token} should be ${color}`);
  }

  assert.match(globals, /--color-action-primary:\s*#3545D6/i);
  assert.match(globals, /--color-focus:\s*#3545D6/i);
  assert.match(globals, /--font-sans:\s*['\"]Open Sauce Two/i);
  assert.match(globals, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
});

test("Open Sauce Two is the only fixed UI family outside editorial themes and exports", () => {
  const packageJson = read("package.json");
  const fonts = read("src/lib/fonts.ts");
  const assistantChat = read("app/assistant/[id]/assistant-chat.module.css");
  const assistantNew = read("app/assistant/new/assistant-new.module.css");
  const calendarView = read("src/components/content/ContentCalendarView.tsx");
  const publicCalendar = read("src/components/content/PublicCalendarView.tsx");
  const calendar = read("src/components/content/ContentCalendar.tsx");

  assert.match(packageJson, /"@fontsource\/open-sauce-two"/);
  assert.doesNotMatch(packageJson, /"@fontsource-variable\/google-sans-flex"/);
  assert.match(fonts, /@fontsource\/open-sauce-two\/latin-(?:300|400)\.css/);

  for (const source of [fonts, assistantChat, assistantNew]) assert.doesNotMatch(source, /Google Sans/i);
  for (const source of [calendarView, publicCalendar, calendar]) assert.doesNotMatch(source, /Work Sans|Fraunces/i);
});

test("legacy charcoal accent is fully retired from first-party UI source", () => {
  const uiSource = `${collectUiSources("app")}\n${collectUiSources("src")}`;
  assert.doesNotMatch(uiSource, /accent-charcoal/);
});

test("public forms provide static accessible feedback with no motion utilities", () => {
  const form = read("app/form/[id]/page.tsx");

  assert.doesNotMatch(form, /\b(?:animate|transition|duration|delay|ease|scale|rotate)-/);
  assert.doesNotMatch(form, /animate-spin|bounce-in|slide-in/);
  assert.match(form, /role="status"/);
  assert.match(form, /aria-live="polite"/);
  assert.match(form, /bg-action-primary/);
});

test("favicon and metadata use the supplied cache-busted brand asset", () => {
  const favicon = readFileSync(new URL("public/favicon.webp", projectRoot));
  const digest = createHash("sha256").update(favicon).digest("hex");
  const layout = read("app/layout.tsx");
  const middleware = read("middleware.ts");

  assert.equal(digest, "d00d12fbc17b596c9e2a4d85295477ebbb203785442b70d5d6d365f335d7e923");
  assert.match(layout, /\/favicon\.webp\?v=noxy-2026/);
  assert.match(layout, /sizes:\s*"222x222"/);
  assert.match(layout, /type:\s*"image\/webp"/);
  assert.match(middleware, /favicon\.webp/, "the auth middleware must allow the public favicon asset");
});

test("new appointment types default to Confianza Índigo without migrating saved colors", () => {
  assert.doesNotMatch(read("app/appointment-types/page.tsx"), /#3B82F6/i);
  assert.match(read("app/appointment-types/page.tsx"), /#3545D6/i);
  assert.doesNotMatch(read("app/api/appointment-types/route.ts"), /#3B82F6/i);
  assert.match(read("app/api/appointment-types/route.ts"), /#3545D6/i);
});
