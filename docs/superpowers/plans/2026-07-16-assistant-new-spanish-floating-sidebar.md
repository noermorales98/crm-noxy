# Assistant New Spanish Floating Sidebar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Traducir `/assistant/new`, reducir su composer al selector de modelo y envío, y reemplazar el sidebar acoplado por una pestaña flotante desplegable exclusivamente en esa ruta.

**Architecture:** `DashboardShell` seleccionará entre el `Sidebar` acoplado existente y un nuevo contenedor `AssistantNewSidebar` para la ruta exacta `/assistant/new`. El estado del panel se modelará mediante funciones puras probadas con `node:test`; la copia española vivirá en un módulo de constantes igualmente probado. `AssistantNewExperience` conservará su lógica de prompt y envío, pero eliminará controles visuales secundarios y hará que las tarjetas sean contenido no interactivo.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5 estricto, Tailwind CSS 4, CSS Modules, lucide-react y `node:test`.

## Global Constraints

- Aplicar el cambio visual solo a `/assistant/new`.
- No modificar autenticación, NextAuth, Prisma, APIs, base de datos ni integraciones.
- No instalar dependencias.
- Mantener `DashboardShell` y el root layout como componentes existentes; no introducir otro router.
- Mantener el envío, streaming, creación de conversación, selector de modelo y preferencia interna de clave.
- El composer visible debe contener únicamente el selector de modelo y el botón de enviar.
- El sidebar normal de `/assistant`, `/assistant/[id]` y el resto del CRM no debe cambiar.
- Toda función nueva debe seguir RED → GREEN y todas las animaciones o listeners deben limpiarse al desmontar.

---

### Task 1: Estado y contenedor del sidebar flotante

**Files:**
- Create: `src/components/assistant-new-sidebar-state.test.ts`
- Create: `src/components/assistant-new-sidebar-state.ts`
- Create: `src/components/AssistantNewSidebar.tsx`
- Modify: `src/components/Sidebar.tsx`
- Modify: `src/components/DashboardShell.tsx`

**Interfaces:**
- Produces: `isAssistantNewRoute(pathname: string): boolean`.
- Produces: `assistantNewSidebarReducer(state, action): "closed" | "open"`.
- Produces: `<AssistantNewSidebar />`, que aloja el `Sidebar` existente sin reservar ancho.
- Extends: `<Sidebar variant="docked" | "floating" />`, con `docked` como valor predeterminado.

- [ ] **Step 1: Escribir las pruebas fallidas del contrato de ruta y estado**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import {
  assistantNewSidebarReducer,
  isAssistantNewRoute,
} from "./assistant-new-sidebar-state.ts";

test("floating sidebar is exclusive to the exact assistant new route", () => {
  assert.equal(isAssistantNewRoute("/assistant/new"), true);
  assert.equal(isAssistantNewRoute("/assistant"), false);
  assert.equal(isAssistantNewRoute("/assistant/abc"), false);
  assert.equal(isAssistantNewRoute("/assistant/new/extra"), false);
});

test("assistant new sidebar starts closed and supports explicit open, close, and toggle actions", () => {
  assert.equal(assistantNewSidebarReducer("closed", { type: "open" }), "open");
  assert.equal(assistantNewSidebarReducer("open", { type: "close" }), "closed");
  assert.equal(assistantNewSidebarReducer("closed", { type: "toggle" }), "open");
  assert.equal(assistantNewSidebarReducer("open", { type: "toggle" }), "closed");
});
```

- [ ] **Step 2: Ejecutar las pruebas y verificar RED**

Run: `node --test src/components/assistant-new-sidebar-state.test.ts`

Expected: FAIL con `ERR_MODULE_NOT_FOUND` para `assistant-new-sidebar-state.ts`.

- [ ] **Step 3: Implementar el estado mínimo probado**

```ts
export type AssistantNewSidebarState = "closed" | "open";

export type AssistantNewSidebarAction =
  | { type: "open" }
  | { type: "close" }
  | { type: "toggle" };

export function isAssistantNewRoute(pathname: string): boolean {
  return pathname === "/assistant/new";
}

export function assistantNewSidebarReducer(
  state: AssistantNewSidebarState,
  action: AssistantNewSidebarAction,
): AssistantNewSidebarState {
  if (action.type === "open") return "open";
  if (action.type === "close") return "closed";
  return state === "open" ? "closed" : "open";
}
```

- [ ] **Step 4: Ejecutar las pruebas y verificar GREEN**

Run: `node --test src/components/assistant-new-sidebar-state.test.ts`

Expected: 2 tests, 2 pass, 0 fail.

- [ ] **Step 5: Crear el contenedor cliente accesible**

Implementar `AssistantNewSidebar.tsx` con `useReducer`, `useEffect` y `useRef`:

```tsx
"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import { PanelLeftOpen, X } from "lucide-react";
import Sidebar from "@/src/components/Sidebar";
import { assistantNewSidebarReducer } from "./assistant-new-sidebar-state";

export default function AssistantNewSidebar() {
  const [state, dispatch] = useReducer(assistantNewSidebarReducer, "closed");
  const openButtonRef = useRef<HTMLButtonElement>(null);
  const restoreFocusRef = useRef(false);
  const isOpen = state === "open";

  const closeAndRestoreFocus = useCallback(() => {
    restoreFocusRef.current = true;
    dispatch({ type: "close" });
  }, []);

  useEffect(() => {
    if (!isOpen && restoreFocusRef.current) {
      restoreFocusRef.current = false;
      openButtonRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeAndRestoreFocus();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isOpen, closeAndRestoreFocus]);

  return (
    <>
      {!isOpen && (
        <button
          ref={openButtonRef}
          type="button"
          aria-label="Mostrar barra lateral"
          aria-expanded={false}
          onClick={() => dispatch({ type: "open" })}
          className="fixed left-4 top-5 z-50 flex size-11 items-center justify-center rounded-xl border border-blue-100/80 bg-white/90 text-[#385577] shadow-lg backdrop-blur-md transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563A9] motion-reduce:transition-none"
        >
          <PanelLeftOpen size={19} aria-hidden="true" />
        </button>
      )}

      {isOpen && (
        <>
          <button
            type="button"
            aria-label="Ocultar barra lateral"
            onClick={closeAndRestoreFocus}
            className="fixed inset-0 z-[60] hidden bg-[#112846]/20 backdrop-blur-[1px] max-sm:block"
          />
          <div className="fixed bottom-3 left-3 top-3 z-[70] w-64 max-w-[calc(100vw-24px)]">
            <Sidebar variant="floating" />
            <button
              type="button"
              aria-label="Ocultar barra lateral"
              aria-expanded={true}
              onClick={closeAndRestoreFocus}
              className="absolute -right-4 top-3 flex size-9 items-center justify-center rounded-xl border border-blue-100 bg-white text-[#385577] shadow-md transition hover:bg-[#F7FAFF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563A9] max-sm:right-3 motion-reduce:transition-none"
            >
              <X size={17} aria-hidden="true" />
            </button>
          </div>
        </>
      )}
    </>
  );
}
```

- [ ] **Step 6: Añadir la variante visual al Sidebar sin cambiar su contenido**

Cambiar la firma y clase raíz en `Sidebar.tsx`:

```tsx
interface SidebarProps {
  variant?: "docked" | "floating";
}

export default function Sidebar({ variant = "docked" }: SidebarProps) {
  const shellClass =
    variant === "floating"
      ? "h-full w-full overflow-hidden rounded-[20px] border border-blue-100/90 bg-white shadow-[0_24px_70px_rgba(38,65,102,0.22)] flex flex-col"
      : `${SIDEBAR_W} h-screen flex-shrink-0 overflow-hidden border-r border-border-subtle bg-white flex flex-col`;
}

<aside ref={asideRef} aria-label="Barra lateral principal" className={shellClass}>
```

El segundo bloque del snippet es la etiqueta de apertura que reemplaza la etiqueta actual dentro del JSX existente. La edición cambia solo la firma, la constante `shellClass`, el `aria-label` y esa etiqueta de apertura; todo su contenido interno y su etiqueta de cierre permanecen literalmente iguales.

- [ ] **Step 7: Seleccionar el modo desde DashboardShell**

Reemplazar la condición móvil anterior por el helper exacto:

```tsx
import AssistantNewSidebar from "@/src/components/AssistantNewSidebar";
import { isAssistantNewRoute } from "@/src/components/assistant-new-sidebar-state";

const useFloatingAssistantSidebar = isAssistantNewRoute(pathname ?? "");

<div className="flex h-screen overflow-hidden bg-surface-app">
  {useFloatingAssistantSidebar ? <AssistantNewSidebar /> : <Sidebar />}
  <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-surface-app">
    {!hideHeader && <Header />}
    <div className={`flex min-h-0 flex-1 flex-col overflow-hidden ${hideHeader ? "bg-transparent" : ""}`}>
      {children}
    </div>
  </div>
</div>
```

- [ ] **Step 8: Verificar Task 1**

Run:

```bash
node --test src/components/assistant-new-sidebar-state.test.ts
npx eslint src/components/assistant-new-sidebar-state.ts src/components/assistant-new-sidebar-state.test.ts src/components/AssistantNewSidebar.tsx src/components/Sidebar.tsx src/components/DashboardShell.tsx
npx tsc --noEmit
```

Expected: tests 2/2 y TypeScript sin errores. ESLint puede mostrar únicamente infracciones preexistentes de `Sidebar.tsx`; comprobar con `git blame` que ninguna línea nueva las introdujo.

- [ ] **Step 9: Commit**

```bash
git add src/components/assistant-new-sidebar-state.ts src/components/assistant-new-sidebar-state.test.ts src/components/AssistantNewSidebar.tsx src/components/Sidebar.tsx src/components/DashboardShell.tsx
git commit -m "feat: add floating assistant new sidebar"
```

---

### Task 2: Traducción y composer mínimo

**Files:**
- Create: `app/assistant/new/_components/assistant-new-copy.test.ts`
- Create: `app/assistant/new/_components/assistant-new-copy.ts`
- Modify: `app/assistant/new/_components/AssistantNewExperience.tsx`
- Modify: `app/assistant/new/assistant-new.module.css`
- Modify: `app/assistant/[id]/_components/ChatView.tsx`

**Interfaces:**
- Produces: `ASSISTANT_NEW_COPY`, un objeto readonly con toda la copia propia de la ruta.
- Changes: `AssistantNewExperienceProps` deja de exponer `preferredKey` y `onKeyChange`.
- Preserves: `ChatView` conserva `preferredKey` y `switchKey` para el composer normal después de enviar.

- [ ] **Step 1: Escribir la prueba fallida de la copia española**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { ASSISTANT_NEW_COPY } from "./assistant-new-copy.ts";

test("assistant new experience exposes approved Spanish copy", () => {
  assert.equal(ASSISTANT_NEW_COPY.heading, "Encontremos las referencias adecuadas para tu trabajo");
  assert.equal(ASSISTANT_NEW_COPY.subtitle, "¿Qué tipo de referencias estás buscando?");
  assert.equal(ASSISTANT_NEW_COPY.promptLabel, "Describe las referencias que estás buscando");
  assert.deepEqual(ASSISTANT_NEW_COPY.prompts, [
    "Crea el diseño de un dashboard financiero",
    "Diseña una identidad de marca con la letra M",
    "Crea un efecto de cristal líquido",
    "Diseña una animación de carga",
    "Crea una landing page para SaaS",
  ]);
});

test("assistant new legal copy is fully localized", () => {
  assert.equal(ASSISTANT_NEW_COPY.terms, "Términos");
  assert.equal(ASSISTANT_NEW_COPY.privacy, "Política de privacidad");
  assert.equal(ASSISTANT_NEW_COPY.legalPrefix, "Al enviar un mensaje a ChatBot, aceptas nuestros");
});
```

- [ ] **Step 2: Ejecutar la prueba y verificar RED**

Run: `node --test app/assistant/new/_components/assistant-new-copy.test.ts`

Expected: FAIL con `ERR_MODULE_NOT_FOUND` para `assistant-new-copy.ts`.

- [ ] **Step 3: Implementar la copia mínima probada**

```ts
export const ASSISTANT_NEW_COPY = {
  heading: "Encontremos las referencias adecuadas para tu trabajo",
  subtitle: "¿Qué tipo de referencias estás buscando?",
  promptLabel: "Describe las referencias que estás buscando",
  promptHint: "Presiona Enter para enviar o Shift + Enter para una nueva línea.",
  visualLabel: "Previsualizaciones de referencias de diseño",
  prompts: [
    "Crea el diseño de un dashboard financiero",
    "Diseña una identidad de marca con la letra M",
    "Crea un efecto de cristal líquido",
    "Diseña una animación de carga",
    "Crea una landing page para SaaS",
  ],
  cards: [
    "Referencia de composición editorial",
    "Referencia de interfaz de producto",
    "Referencia de identidad de marca",
  ],
  legalPrefix: "Al enviar un mensaje a ChatBot, aceptas nuestros",
  terms: "Términos",
  legalJoin: "y confirmas que leíste nuestra",
  privacy: "Política de privacidad",
} as const;
```

- [ ] **Step 4: Ejecutar la prueba y verificar GREEN**

Run: `node --test app/assistant/new/_components/assistant-new-copy.test.ts`

Expected: 2 tests, 2 pass, 0 fail.

- [ ] **Step 5: Simplificar AssistantNewExperience**

Aplicar estos cambios coherentes:

```tsx
import { type ChangeEvent, type KeyboardEvent, useEffect, useRef, useState } from "react";
import { ASSISTANT_NEW_COPY } from "./assistant-new-copy";

const TYPEWRITER_PHRASES = ASSISTANT_NEW_COPY.prompts;

interface AssistantNewExperienceProps {
  onSend: (content: string) => void;
  disabled: boolean;
  model: string;
  onModelChange: (id: string) => void;
}
```

Eliminar `preferredKey`, `onKeyChange`, `hoveredCard`, `retainCardOnMouseLeave`, `retainCardOnBlur`, `isOpenRouter` y los imports de `ImageIcon`, `Layers3`, `Plus`, `FocusEvent` y `MouseEvent`.

Renderizar tarjetas no interactivas:

```tsx
<div className={styles.cards}>
  {CARDS.map((card) => (
    <figure key={card.src} className={`${styles.referenceCard} ${card.className}`}>
      <span className={`${styles.cardEntrance} ${card.entranceClassName}`}>
        <img
          className={`${styles.cardImage} ${card.floatClassName}`}
          src={`${A}/${card.src}`}
          alt={card.label}
          width={card.width}
          height={card.height}
        />
      </span>
    </figure>
  ))}
</div>
```

Asignar las etiquetas de `CARDS` desde `ASSISTANT_NEW_COPY.cards[0]`, `[1]` y `[2]` para que no quede copia inglesa duplicada.

Usar `ASSISTANT_NEW_COPY` para título, subtítulo, prompt, ayuda y footer. Dividir el título por presentación con dos spans sin alterar la frase accesible:

```tsx
<h1 className={styles.heading}>
  Encontremos las referencias adecuadas
  <span>para tu trabajo</span>
</h1>
```

Dejar el toolbar exactamente así:

```tsx
<div className={styles.promptToolbar}>
  <div className={styles.modelSelector}>
    <ModelSelector
      value={model}
      onChange={onModelChange}
      disabled={disabled}
      placement="top-right"
    />
  </div>
  <AnimatedSendButton disabled={disabled || !value.trim()} onClick={submit} />
</div>
```

- [ ] **Step 6: Retirar props visuales desde ChatView**

En el branch `emptyExperience`, dejar:

```tsx
<AssistantNewExperience
  onSend={sendMessage}
  disabled={streaming}
  model={model}
  onModelChange={switchModel}
/>
```

No eliminar `preferredKey` ni `switchKey` de `ChatView`, porque el `ChatInput` normal todavía los consume después de crear la conversación.

- [ ] **Step 7: Eliminar CSS muerto y centrar el toolbar mínimo**

En `assistant-new.module.css`:

- Mantener `.promptToolbar` con `justify-content: space-between`.
- Eliminar `.toolbarLeft` y todas las reglas de `.keyToggle`, `.keyToggleSecondary`, `.secondaryControl`, `.addButton`, `.divider`, `.tag`, `.cardsPaused` y `.referenceCardActive`.
- Cambiar `.referenceCard` a `cursor: default` y eliminar estilos `:hover`/`:focus-visible` que simulaban acción.
- Mantener las tres animaciones idle sin estado React.
- En `@media (max-width: 768px)`, calcular el dropdown como `width: min(288px, calc(100vw - 48px));` porque el sidebar ya no reserva 256 píxeles.
- Eliminar media queries que solo escondían los controles retirados.

- [ ] **Step 8: Verificar Task 2**

Run:

```bash
node --test app/assistant/new/_components/assistant-new-copy.test.ts
node --test app/assistant/new/_components/pixel-grid-math.test.ts
npx eslint app/assistant/new/_components/assistant-new-copy.ts app/assistant/new/_components/assistant-new-copy.test.ts app/assistant/new/_components/AssistantNewExperience.tsx app/assistant/new/_components/AnimatedSendButton.tsx app/assistant/new/_components/PixelGrid.tsx app/assistant/new/_components/pixel-grid-math.ts app/assistant/new/_components/pixel-grid-math.test.ts app/assistant/new/page.tsx
npx tsc --noEmit
```

Expected: copy tests 2/2, PixelGrid 4/4, ESLint focalizado y TypeScript sin errores.

- [ ] **Step 9: Commit**

```bash
git add app/assistant/new/_components/assistant-new-copy.ts app/assistant/new/_components/assistant-new-copy.test.ts app/assistant/new/_components/AssistantNewExperience.tsx app/assistant/new/assistant-new.module.css app/assistant/[id]/_components/ChatView.tsx
git commit -m "feat: localize and simplify assistant new"
```

---

### Task 3: Validación integrada y cierre

**Files:**
- Verify: todos los archivos de Tasks 1 y 2.
- Modify: únicamente archivos del alcance si una prueba revela una regresión causada por esta implementación.

**Interfaces:**
- Consumes: sidebar flotante, copy española y composer mínimo ya implementados.
- Produces: evidencia final de build, lint focalizado, tests y aislamiento de rutas.

- [ ] **Step 1: Ejecutar todas las pruebas nuevas y existentes relevantes**

Run:

```bash
node --test src/components/assistant-new-sidebar-state.test.ts
node --test app/assistant/new/_components/assistant-new-copy.test.ts
node --test app/assistant/new/_components/pixel-grid-math.test.ts
```

Expected: 8 tests, 8 pass, 0 fail.

- [ ] **Step 2: Ejecutar lint focalizado y TypeScript**

Run:

```bash
npx eslint src/components/assistant-new-sidebar-state.ts src/components/assistant-new-sidebar-state.test.ts src/components/AssistantNewSidebar.tsx src/components/DashboardShell.tsx app/assistant/new/_components/assistant-new-copy.ts app/assistant/new/_components/assistant-new-copy.test.ts app/assistant/new/_components/AssistantNewExperience.tsx app/assistant/new/_components/AnimatedSendButton.tsx app/assistant/new/_components/PixelGrid.tsx app/assistant/new/_components/pixel-grid-math.ts app/assistant/new/_components/pixel-grid-math.test.ts app/assistant/new/page.tsx
npx tsc --noEmit
```

Expected: exit 0.

Ejecutar `npx eslint src/components/Sidebar.tsx app/assistant/[id]/_components/ChatView.tsx` por separado y usar `git blame` para confirmar que cualquier infracción reportada ya existía antes de este plan.

- [ ] **Step 3: Ejecutar build de producción**

Run: `npm run build`

Expected: exit 0 y manifest con `/assistant`, `/assistant/[id]` y `/assistant/new`.

- [ ] **Step 4: Ejecutar el lint global existente**

Run: `npm run lint`

Expected baseline conocido: 616 problemas, 491 errores y 125 advertencias. Confirmar que el delta normalizado de archivos modificados sea cero; no corregir deuda ajena al alcance.

- [ ] **Step 5: Verificar el contrato estructural**

Run:

```bash
rg -n "ImageIcon|Layers3|Plus|keyToggle|secondaryControl|addButton|UI Design|preferredKey|onKeyChange" app/assistant/new/_components/AssistantNewExperience.tsx app/assistant/new/assistant-new.module.css
rg -n "Encontremos|¿Qué tipo|Al enviar|Política de privacidad" app/assistant/new
```

Expected: la primera búsqueda no encuentra controles retirados y la segunda encuentra la copia española aprobada.

- [ ] **Step 6: Verificación visual autenticada cuando haya sesión disponible**

Comprobar `/assistant/new` a 320, 768 y 1440 píxeles:

- El trigger flotante aparece cerrado al entrar.
- Abrir/cerrar no mueve el título ni el prompt.
- `Escape`, botón de cierre y backdrop móvil restauran el foco.
- El composer muestra solo modelo y enviar.
- No hay desbordamiento horizontal.
- Reduced motion mantiene la interfaz operable.
- Enviar un prompt crea la conversación y la ruta resultante recupera el sidebar normal.

Si no existe sesión autenticada reutilizable, documentar esa limitación sin afirmar esta verificación manual.

- [ ] **Step 7: Revisión final del diff y commit de correcciones de integración**

Run:

```bash
git diff --check
git status --short
git diff --stat main...HEAD
```

Si las validaciones requieren una corrección dentro del alcance, agregar solo los archivos realmente corregidos de esta lista:

```bash
git add src/components/AssistantNewSidebar.tsx src/components/Sidebar.tsx src/components/DashboardShell.tsx app/assistant/new/_components/AssistantNewExperience.tsx app/assistant/new/assistant-new.module.css app/assistant/[id]/_components/ChatView.tsx
git commit -m "fix: finalize assistant new sidebar experience"
```

Expected: worktree limpio y commits limitados a documentación, sidebar y `/assistant/new`.
