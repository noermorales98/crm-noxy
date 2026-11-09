import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const sidebarSource = readFileSync(new URL("./Sidebar.tsx", import.meta.url), "utf8");
const navsSource = readFileSync(new URL("./context-navs.tsx", import.meta.url), "utf8");
const accountSource = readFileSync(new URL("./AccountMenu.tsx", import.meta.url), "utf8");

// AssistantNav vive en context-navs.tsx (ronda 3: la sidebar por modos no lleva ramas).
function sourceFrom(start: string): string {
  const startIndex = navsSource.indexOf(start);
  assert.notEqual(startIndex, -1, `Missing source marker: ${start}`);
  return navsSource.slice(startIndex);
}

function staticLinkTag(href: string): string {
  const tag = navsSource.match(new RegExp(`<Link\\b(?=[^>]*href="${href}")[^>]*>`))?.[0];
  assert.ok(tag, `Missing Link for ${href}`);
  return tag;
}

const assistantNavSource = sourceFrom("export function AssistantNav(");
const sidebarComponentSource = sidebarSource.slice(sidebarSource.indexOf("export default function Sidebar("));

// Lista plana por modos: cada destino cierra el panel flotante al navegar
// (chooseDestination → onNavigate). La barra fijada no se cierra: ver closeForNavigation.
test("mode destinations close the floating panel before navigating", () => {
  assert.match(sidebarComponentSource, /const chooseDestination = \(\) => \{[\s\S]*?onNavigate\?\.\(\);[\s\S]*?\};/);
  assert.match(sidebarComponentSource, /<NavLeaf[\s\S]*?onChoose=\{chooseDestination\}[\s\S]*?\/>/);
});

// Ronda 3: el asistente usa la sidebar acoplada de siempre en escritorio; no hay fijar, soltar ni vistazo,
// y en móvil el menú es la hoja «Más» (no la sidebar de escritorio).
test("the assistant has no pin / hover-peek and the old drawer shell is gone", () => {
  assert.throws(() => readFileSync(new URL("./AssistantSidebarShell.tsx", import.meta.url), "utf8"), "AssistantSidebarShell.tsx is gone");
  const dashboard = readFileSync(new URL("./DashboardShell.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(dashboard, /useFloatingAssistantSidebar|AssistantSidebarShell/, "no separate assistant chrome");
  assert.match(dashboard, /<Sidebar \/>/, "docked sidebar on every route, /assistant included");
  assert.match(dashboard, /<MobileMoreSheet \/>/, "mobile menu is the bottom sheet");
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
  assert.doesNotMatch(navsSource, /const createNew = \(\) =>/);
});

// Los destinos de cuenta viven en AccountMenu (header y pie de la sidebar); siguen cerrando el panel.
test("account-menu destinations and sign out close the menu and the floating panel", () => {
  assert.match(accountSource, /const choose = \(\) => \{[\s\S]*?setOpen\(false\);[\s\S]*?onNavigate\?\.\(\);[\s\S]*?\};/);
  for (const href of ["/profile", "/settings", "/settings/ai-models", "/settings/equipo"]) {
    const tag = accountSource.match(new RegExp(`<Link\\b(?=[^>]*href="${href}")[^>]*>`))?.[0];
    assert.ok(tag, `Missing Link for ${href}`);
    assert.match(tag, /onClick=\{choose\}/);
  }
  assert.match(accountSource, /const handleSignOut = \(\) => \{[\s\S]*?onNavigate\?\.\(\);[\s\S]*?void signOut\(\);[\s\S]*?\};/);
  assert.match(accountSource, /onClick=\{handleSignOut\}/);
  assert.match(sidebarComponentSource, /<AccountMenu[\s\S]*?onNavigate=\{onNavigate\}/, "the sidebar passes its onNavigate");
});

test("assistant history exposes accessible loading and refresh feedback", () => {
  assert.match(assistantNavSource, /role="region"/);
  assert.match(assistantNavSource, /aria-busy=/);
  assert.match(assistantNavSource, /aria-hidden="true"/);
  assert.match(assistantNavSource, /role="status"/);
  assert.match(assistantNavSource, /No se pudo actualizar el historial/);
});
