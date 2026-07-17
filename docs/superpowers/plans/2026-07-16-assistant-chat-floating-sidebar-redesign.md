# Assistant Chat Floating Sidebar Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminar el parpadeo del historial y la navegación de doble clic mientras todas las rutas del asistente adoptan un sidebar flotante cerrado inicialmente y el diseño aprobado de tarjetas suaves.

**Architecture:** `DashboardShell` mantendrá un solo shell flotante en todas las rutas del asistente; el panel permanecerá montado e inerte al cerrarse para conservar el estado de `Sidebar`. La lista de conversaciones tendrá un reducer y hook propios que mantienen el snapshot durante refresh. Los componentes de conversación reutilizarán `PixelGrid`, `AnimatedSendButton` y un CSS Module compartido para reflejar el lenguaje visual de `/assistant/new`.

**Tech Stack:** Next.js 16 App Router, React 19.2, TypeScript 5, Tailwind CSS 4, CSS Modules, Node native test runner, lucide-react, @hugeicons/react.

## Global Constraints

- Trabajar dentro de la estructura existente; no introducir dependencias nuevas.
- No modificar autenticación, NextAuth, Prisma, APIs ajenas al asistente, variables de entorno ni navegación del resto del CRM.
- Todas las rutas `/assistant`, `/assistant/new` y `/assistant/[id]` usan sidebar flotante cerrado inicialmente.
- Rutas fuera de `/assistant` conservan el sidebar acoplado actual.
- El panel cerrado permanece montado, pero usa `inert`, `aria-hidden` y `pointer-events: none`.
- El chat usa fondo `#EEF1F7`, Google Sans Flex scoped, contenido máximo de 760 píxeles y el diseño aprobado `A. Tarjetas suaves`.
- El compositor visible muestra únicamente selector de modelo y enviar/detener; la clave preferida sigue administrada internamente.
- Conservar Markdown, tablas, código, `ActionCard`, copiar, reintentar, pantalla completa, streaming y movimiento reducido.
- Preservar el cambio local no confirmado de `app/assistant/new/_components/AssistantNewExperience.tsx`; no prepararlo ni incluirlo en commits.

---

## File Map

### Create

- `src/components/AssistantSidebarShell.tsx`: shell persistente, accesibilidad, foco y estado abierto/cerrado.
- `src/components/assistant-conversation-list-state.ts`: reducer puro del historial.
- `src/components/assistant-conversation-list-state.test.ts`: regresiones de loading, refreshing, success y error.
- `src/components/useAssistantConversations.ts`: carga cancelable, listener de refresh y snapshot persistente.
- `src/components/assistant-sidebar-navigation-contract.test.ts`: contrato fuente de navegación semántica y cierre inmediato.
- `app/assistant/[id]/assistant-chat.module.css`: estilos scoped del lienzo, mensajes y compositor.
- `app/assistant/[id]/_components/assistant-chat-contract.test.ts`: contrato fuente del compositor simplificado y elementos funcionales preservados.

### Modify

- `src/components/assistant-new-sidebar-state.ts`: detección de rutas del asistente y acción de navegación.
- `src/components/assistant-new-sidebar-state.test.ts`: rutas y cierre inmediato.
- `src/components/DashboardShell.tsx`: shell flotante en todas las rutas del asistente.
- `src/components/Sidebar.tsx`: hook de historial, skeleton/error y callback de navegación.
- `app/assistant/[id]/_components/ChatView.tsx`: lienzo visual, PixelGrid y compositor sin clave visible.
- `app/assistant/[id]/_components/ChatInput.tsx`: compositor visual nuevo con modelo y enviar/detener.
- `app/assistant/[id]/_components/MessageBubble.tsx`: tarjetas suaves, metadatos y estados de foco.

### Delete

- `src/components/AssistantNewSidebar.tsx`: reemplazado por el shell general del asistente.

---

### Task 1: Route contract and persistent floating shell

**Files:**

- Modify: `src/components/assistant-new-sidebar-state.ts`
- Modify: `src/components/assistant-new-sidebar-state.test.ts`
- Create: `src/components/AssistantSidebarShell.tsx`
- Modify: `src/components/DashboardShell.tsx`
- Delete: `src/components/AssistantNewSidebar.tsx`

**Interfaces:**

- Produces: `isAssistantRoute(pathname: string): boolean`.
- Produces: reducer action `{ type: "navigate" }`, which always returns `"closed"`.
- Produces: `AssistantSidebarShell`, which renders `Sidebar variant="floating" onNavigate={closeForNavigation}`.
- Consumes: existing `getSidebarFocusTarget` for mobile focus containment.

- [ ] **Step 1: Extend the route and reducer tests first**

Add assertions to `src/components/assistant-new-sidebar-state.test.ts`:

```ts
assert.equal(isAssistantRoute("/assistant"), true);
assert.equal(isAssistantRoute("/assistant/new"), true);
assert.equal(isAssistantRoute("/assistant/conversation-123"), true);
assert.equal(isAssistantRoute("/assistant/conversation-123/extra"), false);
assert.equal(isAssistantRoute("/contacts"), false);
assert.equal(assistantNewSidebarReducer("open", { type: "navigate" }), "closed");
assert.equal(assistantNewSidebarReducer("closed", { type: "navigate" }), "closed");
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
node --test src/components/assistant-new-sidebar-state.test.ts
```

Expected: FAIL because `isAssistantRoute` and the `navigate` action do not exist.

- [ ] **Step 3: Implement the pure route and navigation contract**

Add to `src/components/assistant-new-sidebar-state.ts`:

```ts
export type AssistantNewSidebarAction =
  | { type: "open" }
  | { type: "close" }
  | { type: "toggle" }
  | { type: "navigate" };

export function isAssistantRoute(pathname: string): boolean {
  return /^\/assistant(?:\/new|\/[^/]+)?$/.test(pathname);
}
```

Handle `navigate` before `toggle`:

```ts
if (action.type === "open") return "open";
if (action.type === "close" || action.type === "navigate") return "closed";
return state === "open" ? "closed" : "open";
```

- [ ] **Step 4: Run the test and verify GREEN**

Run the command from Step 2. Expected: all sidebar-state tests PASS.

- [ ] **Step 5: Create the persistent shell**

Create `src/components/AssistantSidebarShell.tsx` from the existing focus/backdrop behavior, with these structural requirements:

```tsx
const pathname = usePathname();
const [state, dispatch] = useReducer(assistantNewSidebarReducer, "closed");
const isOpen = state === "open";

useEffect(() => {
  dispatch({ type: "navigate" });
}, [pathname]);

const closeForNavigation = useCallback(() => {
  dispatch({ type: "navigate" });
}, []);
```

Render `Sidebar` unconditionally inside the panel:

```tsx
<div
  ref={panelRef}
  id="assistant-sidebar"
  inert={!isOpen}
  aria-hidden={!isOpen}
  role={isOpen && isMobile ? "dialog" : undefined}
  aria-modal={isOpen && isMobile ? true : undefined}
  className={isOpen ? OPEN_PANEL_CLASSES : CLOSED_PANEL_CLASSES}
>
  <button type="button" aria-label="Ocultar barra lateral" onClick={closeAndRestoreFocus} />
  <Sidebar variant="floating" onNavigate={closeForNavigation} />
</div>
```

Closed classes must include `-translate-x-[calc(100%+32px)] opacity-0 pointer-events-none`; open classes use `translate-x-0 opacity-100`. Both use `transition-[transform,opacity] duration-200` and `motion-reduce:transition-none`.

Keep the opener, mobile backdrop, Escape behavior, focus restoration, focus trap and listener cleanup from `AssistantNewSidebar`.

- [ ] **Step 6: Route the shell through DashboardShell**

Replace exact-new-route detection with:

```tsx
const useFloatingAssistantSidebar = isAssistantRoute(pathname ?? "");
```

Render:

```tsx
{useFloatingAssistantSidebar ? <AssistantSidebarShell /> : <Sidebar />}
```

Remove the obsolete `AssistantNewSidebar` file and import.

- [ ] **Step 7: Verify Task 1**

Run:

```bash
node --test src/components/assistant-new-sidebar-state.test.ts
npx eslint src/components/AssistantSidebarShell.tsx src/components/assistant-new-sidebar-state.ts src/components/assistant-new-sidebar-state.test.ts src/components/DashboardShell.tsx
npx tsc --noEmit
```

Expected: tests PASS, ESLint exits 0, TypeScript exits 0.

- [ ] **Step 8: Commit Task 1**

```bash
git add src/components/AssistantSidebarShell.tsx src/components/AssistantNewSidebar.tsx src/components/assistant-new-sidebar-state.ts src/components/assistant-new-sidebar-state.test.ts src/components/DashboardShell.tsx
git commit -m "feat: persist floating assistant sidebar"
```

---

### Task 2: Conversation history state without flicker

**Files:**

- Create: `src/components/assistant-conversation-list-state.ts`
- Create: `src/components/assistant-conversation-list-state.test.ts`
- Create: `src/components/useAssistantConversations.ts`
- Modify: `src/components/Sidebar.tsx`

**Interfaces:**

- Produces: `AiConversation` with `id`, `title`, `updatedAt`.
- Produces: `AssistantConversationListState` with `status` and `conversations`.
- Produces: `assistantConversationListReducer(state, action)`.
- Produces: `useAssistantConversations(enabled)` returning `{ status, conversations, refresh }`.

- [ ] **Step 1: Write failing reducer tests**

Create `src/components/assistant-conversation-list-state.test.ts` with:

```ts
import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Node's native TypeScript runner requires an explicit extension.
import { assistantConversationListReducer, INITIAL_ASSISTANT_CONVERSATION_LIST_STATE } from "./assistant-conversation-list-state.ts";

const existing = [{ id: "one", title: "Ventas de julio", updatedAt: "2026-07-16" }];

test("first load uses loading without claiming the list is empty", () => {
  assert.deepEqual(INITIAL_ASSISTANT_CONVERSATION_LIST_STATE, {
    status: "loading",
    conversations: [],
  });
});

test("refresh preserves the current conversation snapshot", () => {
  const ready = { status: "ready" as const, conversations: existing };
  assert.deepEqual(assistantConversationListReducer(ready, { type: "request" }), {
    status: "refreshing",
    conversations: existing,
  });
});

test("refreshing a legitimately empty ready list does not return to initial loading", () => {
  const ready = { status: "ready" as const, conversations: [] };
  assert.deepEqual(assistantConversationListReducer(ready, { type: "request" }), {
    status: "refreshing",
    conversations: [],
  });
});

test("refresh errors preserve the previous snapshot", () => {
  const refreshing = { status: "refreshing" as const, conversations: existing };
  assert.deepEqual(assistantConversationListReducer(refreshing, { type: "error" }), {
    status: "error",
    conversations: existing,
  });
});

test("successful requests replace the snapshot", () => {
  const next = [{ id: "two", title: "Seguimiento", updatedAt: "2026-07-17" }];
  assert.deepEqual(
    assistantConversationListReducer(INITIAL_ASSISTANT_CONVERSATION_LIST_STATE, {
      type: "success",
      conversations: next,
    }),
    { status: "ready", conversations: next },
  );
});
```

- [ ] **Step 2: Run the reducer tests and verify RED**

```bash
node --test src/components/assistant-conversation-list-state.test.ts
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Implement the reducer**

Create `src/components/assistant-conversation-list-state.ts`:

```ts
export interface AiConversation {
  id: string;
  title: string;
  updatedAt: string;
}

export type AssistantConversationListStatus = "loading" | "ready" | "refreshing" | "error";

export interface AssistantConversationListState {
  status: AssistantConversationListStatus;
  conversations: AiConversation[];
}

export type AssistantConversationListAction =
  | { type: "request" }
  | { type: "success"; conversations: AiConversation[] }
  | { type: "error" };

export const INITIAL_ASSISTANT_CONVERSATION_LIST_STATE: AssistantConversationListState = {
  status: "loading",
  conversations: [],
};

export function assistantConversationListReducer(
  state: AssistantConversationListState,
  action: AssistantConversationListAction,
): AssistantConversationListState {
  if (action.type === "request") {
    return {
      status: state.status === "loading" ? "loading" : "refreshing",
      conversations: state.conversations,
    };
  }
  if (action.type === "success") return { status: "ready", conversations: action.conversations };
  return { status: "error", conversations: state.conversations };
}
```

- [ ] **Step 4: Run the reducer tests and verify GREEN**

Run Step 2. Expected: five tests PASS.

- [ ] **Step 5: Implement the cancelable hook**

Create `src/components/useAssistantConversations.ts`:

```ts
"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import {
  assistantConversationListReducer,
  INITIAL_ASSISTANT_CONVERSATION_LIST_STATE,
  type AiConversation,
} from "./assistant-conversation-list-state";

export function useAssistantConversations(enabled: boolean) {
  const [state, dispatch] = useReducer(
    assistantConversationListReducer,
    INITIAL_ASSISTANT_CONVERSATION_LIST_STATE,
  );
  const controllerRef = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    dispatch({ type: "request" });
    try {
      const response = await fetch("/api/assistant/conversations", {
        signal: controller.signal,
        cache: "no-store",
      });
      if (!response.ok) throw new Error(`Conversation request failed: ${response.status}`);
      const conversations = (await response.json()) as AiConversation[];
      dispatch({ type: "success", conversations });
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      dispatch({ type: "error" });
    }
  }, [enabled]);

  useEffect(() => {
    void refresh();
    return () => controllerRef.current?.abort();
  }, [refresh]);

  useEffect(() => {
    const onChanged = () => void refresh();
    window.addEventListener("assistant:conversations-changed", onChanged);
    return () => window.removeEventListener("assistant:conversations-changed", onChanged);
  }, [refresh]);

  return { ...state, refresh };
}
```

- [ ] **Step 6: Replace AssistantNav local fetching**

In `Sidebar.tsx`, remove the local conversations state and both fetch effects. Use:

```tsx
const {
  status: conversationStatus,
  conversations,
  refresh: refreshConversations,
} = useAssistantConversations(Boolean(session?.user));
```

After deletion, call `void refreshConversations()` instead of filtering away the authoritative state manually.

Render three skeleton rows when `conversationStatus === "loading"`. Show `Sin conversaciones` only when `conversationStatus === "ready" && conversations.length === 0`. When status is `error` and the snapshot is empty, show `No se pudo cargar el historial` plus a semantic retry button calling `refreshConversations`.

- [ ] **Step 7: Verify Task 2**

```bash
node --test src/components/assistant-conversation-list-state.test.ts
npx eslint src/components/assistant-conversation-list-state.ts src/components/assistant-conversation-list-state.test.ts src/components/useAssistantConversations.ts
npx tsc --noEmit
```

Expected: five tests PASS; new files lint clean; TypeScript exits 0. Record existing `Sidebar.tsx` lint debt separately rather than rewriting unrelated sections.

- [ ] **Step 8: Commit Task 2**

```bash
git add src/components/assistant-conversation-list-state.ts src/components/assistant-conversation-list-state.test.ts src/components/useAssistantConversations.ts src/components/Sidebar.tsx
git commit -m "fix: retain assistant conversation history"
```

---

### Task 3: Single-click assistant navigation

**Files:**

- Modify: `src/components/Sidebar.tsx`
- Modify: `src/components/AssistantSidebarShell.tsx`
- Create: `src/components/assistant-sidebar-navigation-contract.test.ts`

**Interfaces:**

- `SidebarProps` gains `onNavigate?: () => void`.
- `AssistantNav` consumes `onNavigate` and calls it synchronously on every assistant destination.
- `AssistantSidebarShell` passes a stable `closeForNavigation` callback.

- [ ] **Step 1: Write a failing source contract test**

Create `src/components/assistant-sidebar-navigation-contract.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the contract test and verify RED**

```bash
node --test src/components/assistant-sidebar-navigation-contract.test.ts
```

Expected: FAIL because `Nueva conversación` is still a button using `createNew`, and `Sidebar` does not accept `onNavigate`.

- [ ] **Step 3: Thread the callback through Sidebar**

Use exact signatures:

```ts
interface SidebarProps {
  variant?: "docked" | "floating";
  onNavigate?: () => void;
}

interface AssistantNavProps {
  onSearchOpen: () => void;
  onNavigate?: () => void;
}
```

Change the function signature to `function AssistantNav({ onSearchOpen, onNavigate }: AssistantNavProps)` and keep its current session, pathname, deletion and rendering logic until the specific navigation edits in Step 4.

Pass `onNavigate` only to `AssistantNav`; other sidebar tabs retain existing behavior.

- [ ] **Step 4: Replace the new-conversation button with a prefetched Link**

Use:

```tsx
<Link
  href="/assistant/new"
  prefetch
  onClick={onNavigate}
  className="w-full flex items-center justify-center gap-2 bg-[#2D2D2D] text-white py-2.5 px-3 rounded-lg text-sm font-medium hover:bg-[#1a1a1a] transition-[transform,background-color] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563A9]"
>
  <HugeiconsIcon icon={Add01Icon} size={ICON_SIZE} color="white" />
  Nueva conversación
</Link>
```

Remove `createNew` and its `router.push` call. Add `onClick={onNavigate}` to each conversation `Link`. Do not await refresh or API work before navigation.

- [ ] **Step 5: Verify Task 3**

```bash
node --test src/components/assistant-new-sidebar-state.test.ts src/components/assistant-conversation-list-state.test.ts src/components/assistant-sidebar-navigation-contract.test.ts
npx tsc --noEmit
```

Expected: all focused tests PASS and TypeScript exits 0.

- [ ] **Step 6: Commit Task 3**

```bash
git add src/components/Sidebar.tsx src/components/AssistantSidebarShell.tsx src/components/assistant-sidebar-navigation-contract.test.ts
git commit -m "fix: make assistant navigation respond immediately"
```

---

### Task 4: Soft-card conversation redesign

**Files:**

- Create: `app/assistant/[id]/assistant-chat.module.css`
- Create: `app/assistant/[id]/_components/assistant-chat-contract.test.ts`
- Modify: `app/assistant/[id]/_components/ChatView.tsx`
- Modify: `app/assistant/[id]/_components/ChatInput.tsx`
- Modify: `app/assistant/[id]/_components/MessageBubble.tsx`

**Interfaces:**

- `ChatInput` retains `onSend`, `onStop`, `disabled`, `model`, `onModelChange`; removes `preferredKey` and `onKeyChange` from its visible interface.
- `ChatView` continues using internal `preferredKey` for API requests.
- `MessageBubble` retains every existing functional prop.

- [ ] **Step 1: Write a failing source contract test**

Create `app/assistant/[id]/_components/assistant-chat-contract.test.ts`:

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const inputSource = readFileSync(new URL("./ChatInput.tsx", import.meta.url), "utf8");
const bubbleSource = readFileSync(new URL("./MessageBubble.tsx", import.meta.url), "utf8");
const viewSource = readFileSync(new URL("./ChatView.tsx", import.meta.url), "utf8");

test("existing chats use the approved simplified composer", () => {
  assert.match(inputSource, /AnimatedSendButton/);
  assert.doesNotMatch(inputSource, /preferredKey|onKeyChange|K\{preferredKey\}/);
  assert.match(inputSource, /ModelSelector/);
  assert.match(inputSource, /Detener generación/);
});

test("the redesign preserves message capabilities", () => {
  assert.match(bubbleSource, /ReactMarkdown/);
  assert.match(bubbleSource, /ActionCard/);
  assert.match(bubbleSource, /openRetry/);
  assert.match(bubbleSource, /handleCopy/);
  assert.match(bubbleSource, /setFullscreen/);
  assert.match(viewSource, /PixelGrid/);
});
```

- [ ] **Step 2: Run the contract test and verify RED**

```bash
node --test 'app/assistant/[id]/_components/assistant-chat-contract.test.ts'
```

Expected: FAIL because `ChatInput` does not use `AnimatedSendButton`, still includes key props, and `ChatView` does not render `PixelGrid`.

- [ ] **Step 3: Create the scoped CSS Module**

Create `app/assistant/[id]/assistant-chat.module.css` with these required selectors and exact core tokens:

```css
.experience {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  overflow: hidden;
  background: #eef1f7;
  color: #11315d;
  font-family: "Google Sans Flex Variable", "Google Sans Flex", sans-serif;
}

.scrollArea { position: relative; z-index: 5; flex: 1; min-height: 0; overflow-y: auto; overflow-x: hidden; padding: 32px 16px 20px; }
.messageColumn { width: 100%; max-width: 760px; margin: 0 auto; }
.userCard { background: #11315d; color: #fff; border-radius: 18px 18px 6px 18px; box-shadow: 0 12px 30px rgba(17,49,93,.14); }
.assistantCard { background: rgba(255,255,255,.94); border: 1px solid rgba(34,106,205,.08); border-radius: 18px 18px 18px 6px; box-shadow: 0 16px 42px rgba(50,84,126,.09); }
.composerOuter { width: min(702px, calc(100% - 32px)); margin: 0 auto 16px; padding: 4px; border-radius: 24px; background: rgba(157,196,250,.15); backdrop-filter: blur(32px); }
.composerInner { min-height: 72px; border-radius: 20px; background: #fff; border: 1px solid rgba(34,106,205,.05); box-shadow: 0 18px 45px rgba(50,84,126,.1); }
```

Add responsive rules at `max-width: 639px`, focus-visible rules using `#2563A9`, horizontal overflow containment for prose/code/tables, and reduced-motion rules that disable decorative transitions and caret animation.

- [ ] **Step 4: Restyle ChatView**

Import `PixelGrid` and the module:

```tsx
import PixelGrid from "@/app/assistant/new/_components/PixelGrid";
import styles from "../assistant-chat.module.css";
```

Use:

```tsx
<div className={styles.experience}>
  <PixelGrid side="left" />
  <PixelGrid side="right" />
  <div className={styles.scrollArea}>
    <div className={styles.messageColumn}>
      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          role={message.role}
          content={message.content}
          streaming={streaming && message.id === streamingIdRef.current}
          modelName={message.model ? getModelById(message.model).name : undefined}
          currentModelId={message.model}
          keyUsed={message.keyUsed}
          onRetry={message.role === "assistant" ? (newModelId) => retryMessage(message.id, newModelId) : undefined}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  </div>
  <ChatInput
    onSend={sendMessage}
    onStop={stopStreaming}
    disabled={streaming}
    model={model}
    onModelChange={switchModel}
  />
</div>
```

Do not pass `preferredKey` or `onKeyChange` to `ChatInput`; retain both values and `switchKey` only where required by streaming/retry logic. If `switchKey` becomes unused, remove that function while retaining `preferredKey` state and local-storage initialization.

- [ ] **Step 5: Restyle ChatInput and simplify controls**

Import:

```tsx
import AnimatedSendButton from "@/app/assistant/new/_components/AnimatedSendButton";
import styles from "../assistant-chat.module.css";
```

Remove key-selector props and markup. Keep textarea auto-resize. The toolbar renders `ModelSelector`, then:

```tsx
{disabled ? (
  <button
    type="button"
    onClick={onStop}
    aria-label="Detener generación"
    className={styles.stopButton}
  >
    <Square size={13} fill="currentColor" aria-hidden="true" />
  </button>
) : (
  <AnimatedSendButton disabled={!value.trim()} onClick={submit} />
)}
```

The textarea label remains accessible, Enter sends, Shift+Enter adds a line, and disabled/streaming states remain functional.

- [ ] **Step 6: Restyle MessageBubble without removing behavior**

Import the CSS Module and replace shell class strings with `styles.messageRow`, `styles.userMessage`, `styles.userCard`, `styles.assistantMessage`, `styles.assistantCard`, `styles.assistantAvatar`, `styles.metaRow`, and `styles.metaButton`. Keep the complete `ReactMarkdown` component map, `ActionCard`, retry fetch, clipboard action, fullscreen portal and Escape cleanup unchanged.

Add `aria-label="Ver respuesta en pantalla completa"`, `aria-label="Reintentar con otro modelo"` and `aria-label="Copiar respuesta"` to icon/action controls while retaining visible Spanish labels.

- [ ] **Step 7: Run the contract test and verify GREEN**

```bash
node --test 'app/assistant/[id]/_components/assistant-chat-contract.test.ts'
```

Expected: two tests PASS.

- [ ] **Step 8: Verify Task 4**

```bash
npx eslint 'app/assistant/[id]/_components/ChatView.tsx' 'app/assistant/[id]/_components/ChatInput.tsx' 'app/assistant/[id]/_components/MessageBubble.tsx' 'app/assistant/[id]/_components/assistant-chat-contract.test.ts'
npx tsc --noEmit
```

Expected: no new lint findings in changed lines and TypeScript exits 0. Existing `MessageBubble` `no-explicit-any` findings must either be corrected with typed parsing or reported as unchanged baseline.

- [ ] **Step 9: Commit Task 4**

```bash
git add 'app/assistant/[id]/assistant-chat.module.css' 'app/assistant/[id]/_components/ChatView.tsx' 'app/assistant/[id]/_components/ChatInput.tsx' 'app/assistant/[id]/_components/MessageBubble.tsx' 'app/assistant/[id]/_components/assistant-chat-contract.test.ts'
git commit -m "feat: redesign assistant conversations"
```

---

### Task 5: Integrated verification and responsive polish

**Files:**

- Modify only files from Tasks 1–4 when verification exposes a regression.
- Do not modify `app/assistant/new/_components/AssistantNewExperience.tsx` unless the user separately authorizes inclusion of its existing local diff.

**Interfaces:** None; this task validates the integrated outcome.

- [ ] **Step 1: Run all focused tests**

```bash
node --test \
  src/components/assistant-new-sidebar-state.test.ts \
  src/components/assistant-conversation-list-state.test.ts \
  src/components/assistant-sidebar-navigation-contract.test.ts \
  src/lib/assistant-stream-lifecycle.test.ts \
  app/assistant/new/_components/assistant-new-copy.test.ts \
  app/assistant/new/_components/pixel-grid-math.test.ts \
  'app/assistant/[id]/_components/assistant-chat-contract.test.ts'
```

Expected: all tests PASS with zero failures.

- [ ] **Step 2: Run focused lint and TypeScript**

```bash
npx eslint \
  src/components/AssistantSidebarShell.tsx \
  src/components/assistant-new-sidebar-state.ts \
  src/components/assistant-new-sidebar-state.test.ts \
  src/components/assistant-conversation-list-state.ts \
  src/components/assistant-conversation-list-state.test.ts \
  src/components/assistant-sidebar-navigation-contract.test.ts \
  src/components/useAssistantConversations.ts \
  src/components/DashboardShell.tsx \
  'app/assistant/[id]/_components/ChatView.tsx' \
  'app/assistant/[id]/_components/ChatInput.tsx' \
  'app/assistant/[id]/_components/MessageBubble.tsx' \
  'app/assistant/[id]/_components/assistant-chat-contract.test.ts'
npx tsc --noEmit
```

Expected: ESLint has no findings caused by this implementation; TypeScript exits 0.

- [ ] **Step 3: Run the production build**

```bash
npm run build
```

Expected: exit 0; route table includes `/assistant`, `/assistant/new` and `/assistant/[id]`.

- [ ] **Step 4: Compare repository-wide lint with baseline**

```bash
npm run lint
```

Expected baseline before this plan: 616 problems, 491 errors and 125 warnings. The implementation must not increase these counts.

- [ ] **Step 5: Browser QA**

With an authenticated session, verify at 320, 768 and 1440 pixels:

1. `/assistant/new` opens with the sidebar closed.
2. `/assistant/[id]` opens with the sidebar closed.
3. Opening, closing and reopening does not flash `Sin conversaciones`.
4. Clicking a conversation closes the panel and navigates on the first click.
5. Clicking `Nueva conversación` closes the panel on the first click, including from `/assistant/new`.
6. Tab cannot enter the closed panel; mobile focus remains trapped when open.
7. User and assistant messages match the selected soft-card direction.
8. Markdown, action cards, copy, retry, fullscreen, streaming and stop work.
9. Reduced motion disables sidebar travel and decorative caret motion.

- [ ] **Step 6: Confirm diff integrity**

```bash
git diff --check
git status --short
git diff --stat HEAD~4..HEAD
```

Expected: no whitespace errors; only planned files plus the preserved preexisting local modification are present.

- [ ] **Step 7: Commit verification-only fixes if needed**

If Steps 1–6 required code changes, stage only those planned files and commit:

```bash
git commit -m "fix: polish assistant chat integration"
```

If no files changed, do not create an empty commit.
