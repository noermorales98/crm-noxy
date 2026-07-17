import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const sidebarSource = readFileSync(new URL("./Sidebar.tsx", import.meta.url), "utf8");
const shellSource = readFileSync(new URL("./AssistantSidebarShell.tsx", import.meta.url), "utf8");

test("assistant destinations close the floating panel and use semantic navigation", () => {
  assert.match(sidebarSource, /href="\/assistant\/new"/);
  assert.match(sidebarSource, /prefetch/);
  assert.match(sidebarSource, /onClick=\{onNavigate\}/);
  assert.doesNotMatch(sidebarSource, /const createNew = \(\) =>/);
  assert.match(shellSource, /onNavigate=\{closeForNavigation\}/);
});
