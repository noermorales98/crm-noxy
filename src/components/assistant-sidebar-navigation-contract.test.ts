import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const sidebarSource = readFileSync(new URL("./Sidebar.tsx", import.meta.url), "utf8");
const shellSource = readFileSync(new URL("./AssistantSidebarShell.tsx", import.meta.url), "utf8");

function sourceBetween(start: string, end: string): string {
  const startIndex = sidebarSource.indexOf(start);
  const endIndex = sidebarSource.indexOf(end, startIndex);
  assert.notEqual(startIndex, -1, `Missing source marker: ${start}`);
  assert.notEqual(endIndex, -1, `Missing source marker: ${end}`);
  return sidebarSource.slice(startIndex, endIndex);
}

function staticLinkTag(href: string): string {
  const tag = sidebarSource.match(new RegExp(`<Link\\b(?=[^>]*href="${href}")[^>]*>`))?.[0];
  assert.ok(tag, `Missing Link for ${href}`);
  return tag;
}

const sectionSwitcherSource = sourceBetween("function SectionSwitcher(", "// ─── Delete confirmation modal");
const assistantNavSource = sourceBetween("function AssistantNav(", "// ─── Main Sidebar");
const sidebarComponentSource = sidebarSource.slice(sidebarSource.indexOf("export default function Sidebar("));

test("section switching closes before every route push", () => {
  assert.match(sectionSwitcherSource, /onNavigate\?: \(\) => void/);
  assert.match(
    sectionSwitcherSource,
    /const selectSection =[\s\S]*?onNavigate\?\.\(\);[\s\S]*?router\.push\(section\.href\);/,
  );
  assert.match(sidebarComponentSource, /<SectionSwitcher[\s\S]*?onNavigate=\{onNavigate\}[\s\S]*?\/>/);
});

test("assistant conversation destinations keep the floating panel open", () => {
  const newConversationLink = staticLinkTag("/assistant/new");
  assert.match(newConversationLink, /\bprefetch\b/);
  assert.doesNotMatch(newConversationLink, /onClick=\{onNavigate\}/);

  const conversationLink = assistantNavSource.match(/<Link\s+href=\{`\/assistant\/\$\{conv\.id\}`\}[\s\S]*?>/)?.[0];
  assert.ok(conversationLink, "Missing conversation Link");
  assert.doesNotMatch(conversationLink, /onClick=\{onNavigate\}/);

  assert.match(
    assistantNavSource,
    /if \(pathname === `\/assistant\/\$\{id\}`\) \{[\s\S]*?router\.push\("\/assistant\/new"\);[\s\S]*?\}/,
  );
  assert.doesNotMatch(
    assistantNavSource,
    /if \(pathname === `\/assistant\/\$\{id\}`\) \{[\s\S]*?onNavigate\?\.\(\);/,
  );
  assert.doesNotMatch(sidebarSource, /const createNew = \(\) =>/);
  assert.match(shellSource, /onNavigate=\{closeForNavigation\}/);
  assert.match(shellSource, /writeAssistantSidebarStoredMode/);
  assert.doesNotMatch(shellSource, /dispatch\(\{ type: "navigate" \}\)/);
  assert.match(shellSource, /dispatch\(\{ type: "unpin" \}\)/);
});

test("floating sidebar uses clear liquid glass and pin hover peek", () => {
  assert.match(sidebarComponentSource, /variant === "floating"[\s\S]*?crm-glass/);
  assert.match(sidebarComponentSource, /variant === "pinned"[\s\S]*?crm-glass/);
  assert.match(shellSource, /crm-glass-clear/);
  assert.match(shellSource, /data-assistant-sidebar-edge/);
  assert.match(shellSource, /data-assistant-sidebar-pin-hint/);
  assert.match(shellSource, /data-assistant-sidebar-pinned/);
  assert.match(shellSource, /variant="pinned"/);
  assert.match(shellSource, /relative z-20 flex h-full w-64 shrink-0/);
  assert.match(shellSource, /aria-label="Fijar barra lateral"/);
  assert.match(shellSource, /title="Fijar barra lateral"/);
  assert.match(shellSource, /dispatch\(\{ type: "peekOpen" \}\)/);
  assert.match(shellSource, /dispatch\(\{ type: "peekClose" \}\)/);
  assert.match(shellSource, /registerOpenMobileSidebar/);
  assert.match(shellSource, /if \(isMobile\)/);
});

test("user-menu destinations and sign out close the floating panel", () => {
  assert.match(
    sidebarComponentSource,
    /const closeUserMenuForNavigation = \(\) => \{[\s\S]*?setSidebarUserOpen\(false\);[\s\S]*?onNavigate\?\.\(\);[\s\S]*?\};/,
  );

  for (const href of ["/profile", "/settings", "/settings/digest", "/settings/ai-models"]) {
    assert.match(staticLinkTag(href), /onClick=\{closeUserMenuForNavigation\}/);
  }

  assert.match(
    sidebarComponentSource,
    /const handleSignOut = \(\) => \{[\s\S]*?onNavigate\?\.\(\);[\s\S]*?void signOut\(\);[\s\S]*?\};/,
  );
  assert.match(sidebarComponentSource, /onClick=\{handleSignOut\}/);
});

test("assistant history exposes accessible loading and refresh feedback", () => {
  assert.match(assistantNavSource, /role="region"/);
  assert.match(assistantNavSource, /aria-busy=/);
  assert.match(assistantNavSource, /aria-hidden="true"/);
  assert.match(assistantNavSource, /role="status"/);
  assert.match(assistantNavSource, /No se pudo actualizar el historial/);
});
