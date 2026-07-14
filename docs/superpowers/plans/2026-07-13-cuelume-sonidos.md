# Integración de sonidos de interacción (cuelume) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add subtle interactive sound feedback (press/release on buttons, hover on sidebar nav, success/error on toasts) app-wide using the `cuelume` library, with a user-facing on/off toggle in Settings.

**Architecture:** A single new `SoundContext` provider (following the app's existing provider-nesting pattern in `app/layout.tsx`) registers document-level delegated pointer listeners so every `<button>` in the app gets sound without editing the ~76 files that render buttons. Sidebar nav hover and toast sounds are added as small, targeted edits to the two files that already own that behavior. cuelume's imperative `play()`/`setEnabled()` API is used directly — its `data-cuelume-*`/`bind()` attribute system is NOT used.

**Tech Stack:** Next.js 16, React 19, TypeScript (strict), Tailwind CSS, `cuelume@0.1.0` (new dependency).

## Global Constraints

- cuelume is ESM-only — import via native `import`, never `require()`.
- cuelume is SSR-safe (import/`play()` on the server is a no-op), so it can be imported at the top of `"use client"` files without guards.
- The project has **no test framework** installed (no Jest/Vitest/Playwright, no `*.test.*` files). Verification for every task below is: `npx tsc --noEmit` (must pass with zero errors) + manual browser verification via `npm run dev`. Do not install a test framework as part of this plan — out of scope per the spec.
- Persist the sound on/off preference in `localStorage` under the exact key `noxy-sound-enabled`, values `"1"` / `"0"`, using direct `localStorage.getItem`/`setItem` calls (no wrapper/hook abstraction) — this matches the existing convention in `src/components/kb/KbPublicViewer.tsx:535,540` and `src/lib/kb-draft.ts`.
- Do not add `data-cuelume-*` attributes to any component and do not call cuelume's `bind()` — all integration goes through `play()` and `setEnabled()`.
- Do not add sound to warning/info toasts, tables, or any link outside the sidebar — out of scope per the spec.

---

### Task 1: Install cuelume + global `SoundContext` (button press/release everywhere)

**Files:**
- Modify: `package.json` (via `npm install`)
- Create: `src/context/SoundContext.tsx`
- Modify: `app/layout.tsx`

**Interfaces:**
- Produces: `SoundProvider` (React component, wraps `children: React.ReactNode`), `useSoundSettings()` hook returning `{ enabled: boolean; toggle: () => void }`. Later tasks (Task 4) import `useSoundSettings` from `@/src/context/SoundContext`.

- [ ] **Step 1: Install the dependency**

Run: `npm install cuelume`
Expected: `package.json` gains `"cuelume": "^0.1.0"` under `dependencies`, `package-lock.json` updated, no install errors.

- [ ] **Step 2: Create `src/context/SoundContext.tsx`**

```tsx
"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { play, setEnabled as setCuelumeEnabled } from "cuelume";

const SOUND_ENABLED_KEY = "noxy-sound-enabled";

interface SoundContextValue {
  enabled: boolean;
  toggle: () => void;
}

const SoundContext = createContext<SoundContextValue | null>(null);

function readStoredPreference(): boolean {
  const stored = localStorage.getItem(SOUND_ENABLED_KEY);
  return stored === null ? true : stored === "1";
}

export function SoundProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    const initial = readStoredPreference();
    setEnabled(initial);
    setCuelumeEnabled(initial);
  }, []);

  useEffect(() => {
    function isFineMouseButton(target: EventTarget | null): target is HTMLButtonElement {
      const button = (target as HTMLElement)?.closest?.("button");
      return !!button && !button.disabled;
    }

    function handlePointerDown(e: PointerEvent) {
      if (e.pointerType === "mouse" && isFineMouseButton(e.target)) play("press");
    }
    function handlePointerUp(e: PointerEvent) {
      if (e.pointerType === "mouse" && isFineMouseButton(e.target)) play("release");
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("pointerup", handlePointerUp);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("pointerup", handlePointerUp);
    };
  }, []);

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      localStorage.setItem(SOUND_ENABLED_KEY, next ? "1" : "0");
      setCuelumeEnabled(next);
      return next;
    });
  }, []);

  return (
    <SoundContext.Provider value={{ enabled, toggle }}>
      {children}
    </SoundContext.Provider>
  );
}

export function useSoundSettings() {
  const ctx = useContext(SoundContext);
  if (!ctx) throw new Error("useSoundSettings must be used inside SoundProvider");
  return ctx;
}
```

- [ ] **Step 3: Wire `SoundProvider` into `app/layout.tsx`**

Read the current file first, then add the import and wrap `AppShell` with `SoundProvider` (innermost, right before `AppShell`, so its listeners cover everything `AppShell` renders):

```tsx
import type { Metadata } from "next";
import AuthProvider from "@/src/components/AuthProvider";
import { ToastProvider } from "@/src/context/ToastContext";
import { ConfirmProvider } from "@/src/context/ConfirmContext";
import { HeaderProvider } from "@/src/context/HeaderContext";
import { NotificationProvider } from "@/src/context/NotificationContext";
import { AiProvider } from "@/src/components/ai/AiProvider";
import { SoundProvider } from "@/src/context/SoundContext";
import AppShell from "@/src/components/AppShell";
import "@/src/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Noxy CRM - Gestión de Clientes",
  description: "Gestión de Clientes",
  icons: {
    icon: "/favicon.webp",
    apple: "/favicon.webp",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="bg-surface-app text-text-primary antialiased">
        <AuthProvider>
          <ToastProvider>
            <ConfirmProvider>
              <HeaderProvider>
                <NotificationProvider>
                  <AiProvider>
                    <SoundProvider>
                      <AppShell>{children}</AppShell>
                    </SoundProvider>
                  </AiProvider>
                </NotificationProvider>
              </HeaderProvider>
            </ConfirmProvider>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors related to `SoundContext.tsx` or `app/layout.tsx`.

- [ ] **Step 5: Manual browser verification**

Run: `npm run dev`, open the app in a browser with sound on.
- Click any button anywhere in the app (e.g. the sidebar's search icon, a "Guardar" button) — expect to hear a short press sound on mouse-down and a release sound on mouse-up.
- Click a `<Link>`-only element (no `<button>`) — expect no sound (buttons only in this task).
- Open DevTools console — expect no errors.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/context/SoundContext.tsx app/layout.tsx
git commit -m "feat: add cuelume-based global button sound feedback"
```

---

### Task 2: Sidebar nav hover sound

**Files:**
- Modify: `src/components/Sidebar.tsx:634-680` (component body and root `<aside>`)

**Interfaces:**
- Consumes: `play` from `cuelume` (same import used in Task 1's `SoundContext.tsx`, imported independently here since this is a plain function call, not context state).
- No new exports; purely internal to `Sidebar`.

- [ ] **Step 1: Add a ref and scoped hover listener to `Sidebar.tsx`**

Read `src/components/Sidebar.tsx` first. Add the import at the top (near the other imports, e.g. after the `lucide-react` import on line 39):

```tsx
import { play } from "cuelume";
```

Inside `export default function Sidebar()` (starting at line 634), add a ref and a `useEffect` alongside the existing refs/effects (e.g. right after the outside-click effect that ends at line 668):

```tsx
  const asideRef = useRef<HTMLElement>(null);

  // Hover sound for sidebar nav links only (scoped to this container)
  useEffect(() => {
    const container = asideRef.current;
    if (!container) return;

    let lastLink: HTMLElement | null = null;

    function handlePointerOver(e: PointerEvent) {
      if (e.pointerType !== "mouse") return;
      const link = (e.target as HTMLElement).closest("a");
      if (link && link !== lastLink && container!.contains(link)) {
        lastLink = link;
        play("tick");
      } else if (!link) {
        lastLink = null;
      }
    }

    function handlePointerOut(e: PointerEvent) {
      const link = (e.target as HTMLElement).closest("a");
      if (link && link === lastLink) {
        const related = e.relatedTarget as HTMLElement | null;
        if (!related || !link.contains(related)) lastLink = null;
      }
    }

    container.addEventListener("pointerover", handlePointerOver);
    container.addEventListener("pointerout", handlePointerOut);
    return () => {
      container.removeEventListener("pointerover", handlePointerOver);
      container.removeEventListener("pointerout", handlePointerOut);
    };
  }, []);
```

Then attach `asideRef` to the root element on line 674:

```tsx
      <aside ref={asideRef} className={`${SIDEBAR_W} bg-white border-r border-border-subtle h-screen flex flex-col flex-shrink-0 overflow-hidden`}>
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors (in particular, `HTMLElement` ref type matches `<aside>`).

- [ ] **Step 3: Manual browser verification**

Run: `npm run dev` (or reuse the dev server from Task 1).
- Move the mouse across several sidebar nav items (Home, Contactos, Proyectos, etc.) — expect one `tick` sound per distinct link entered, not a continuous stream while lingering on the same link.
- Hover over a link inside the main content area (not the sidebar) — expect no `tick` sound.
- Hover the sidebar with a touch/trackpad simulated as non-mouse pointer (skip if not easily testable locally) — otherwise confirm no console errors during normal mouse use.

- [ ] **Step 4: Commit**

```bash
git add src/components/Sidebar.tsx
git commit -m "feat: add hover sound to sidebar navigation links"
```

---

### Task 3: Toast success/error sound

**Files:**
- Modify: `src/context/ToastContext.tsx`

**Interfaces:**
- Consumes: `play` from `cuelume`.
- No changes to `ToastContextValue`'s public shape (`addToast(message, type?)` signature unchanged).

- [ ] **Step 1: Add sound to `addToast`**

Read `src/context/ToastContext.tsx` first, then update it:

```tsx
"use client";

import { createContext, useContext, useCallback, ReactNode } from "react";
import { sileo, Toaster } from "sileo";
import { play } from "cuelume";
import "sileo/styles.css";

export type ToastType = "success" | "error" | "warning" | "info";

interface ToastContextValue {
  addToast: (message: string, type?: ToastType) => void;
}

const SILEO_METHODS = {
  success: sileo.success,
  error: sileo.error,
  warning: sileo.warning,
  info: sileo.info,
} as const;

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const addToast = useCallback((message: string, type: ToastType = "info") => {
    SILEO_METHODS[type]({ title: message });
    if (type === "success") play("success");
    else if (type === "error") play("droplet");
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      <Toaster
        position="top-center"
        offset={{ top: 20 }}
        theme="light"
        options={{ duration: 4000 }}
      />
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual browser verification**

Run: `npm run dev`.
- Trigger a success toast (e.g. save a settings form successfully) — expect the `success` sound alongside the toast.
- Trigger an error toast (e.g. submit an invalid form that fails, or disconnect network and try an action) — expect the `droplet` sound.
- Trigger a warning/info toast if one exists in the app — expect no sound.

- [ ] **Step 4: Commit**

```bash
git add src/context/ToastContext.tsx
git commit -m "feat: play sound on success/error toasts"
```

---

### Task 4: Settings toggle for sound on/off

**Files:**
- Modify: `app/settings/page.tsx`

**Interfaces:**
- Consumes: `useSoundSettings()` from `@/src/context/SoundContext` (produced in Task 1) → `{ enabled: boolean; toggle: () => void }`.

- [ ] **Step 1: Add the toggle section to Settings**

Read `app/settings/page.tsx` first. Add the import:

```tsx
import { useSoundSettings } from "@/src/context/SoundContext";
```

Inside `export default function SettingsPage()`, add the hook call alongside the other `useState` calls near the top:

```tsx
  const { enabled: soundEnabled, toggle: toggleSound } = useSoundSettings();
```

Add a new section using the exact toggle-switch visual pattern already used in `app/settings/digest/page.tsx:187-198`. Insert it right after the opening `<div className="bg-white rounded-lg border border-border-subtle p-8 max-w-2xl flex flex-col gap-8">` (line 159) and before the Google Calendar section, followed by an `<hr />` matching the existing section separators:

```tsx
            {/* Sonidos de interacción */}
            <div>
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <h2 className="text-lg font-bold text-text-primary mb-1">Sonidos de interacción</h2>
                  <p className="text-sm text-text-secondary">Reproduce sonidos sutiles al pulsar botones, navegar y recibir notificaciones.</p>
                </div>
                <button
                  type="button"
                  onClick={toggleSound}
                  className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${soundEnabled ? "bg-emerald-500" : "bg-nav-active"}`}
                >
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${soundEnabled ? "translate-x-5" : "translate-x-0.5"}`} />
                </button>
              </label>
            </div>

            <hr className="border-border-subtle" />

```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual browser verification**

Run: `npm run dev`, navigate to `/settings`.
- Confirm the "Sonidos de interacción" toggle appears at the top of the settings card, switch reflects current state (on by default for a fresh browser profile).
- Click the toggle off — click any button elsewhere in the app — expect no sound.
- Reload the page — expect the toggle to remain off (persisted via `localStorage`).
- Click the toggle back on — confirm sounds resume.

- [ ] **Step 4: Commit**

```bash
git add app/settings/page.tsx
git commit -m "feat: add sound on/off toggle to Settings page"
```
