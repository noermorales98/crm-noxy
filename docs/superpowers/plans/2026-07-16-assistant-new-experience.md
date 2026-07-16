# Assistant New Visual Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar exclusivamente el estado vacío de `/assistant/new` por la experiencia visual aprobada, conservando el flujo real de creación, envío y streaming del Assistant.

**Architecture:** `app/assistant/new/page.tsx` seguirá siendo Server Component y activará una variante visual en `ChatView`. El estado continuo del canvas y del botón animado vivirá en Client Components aislados que usan refs, CSS variables y limpieza estricta; el prompt reutilizará `sendMessage`, modelo y key existentes.

**Tech Stack:** Next.js 16.1.6 App Router, React 19.2, TypeScript 5 strict, Tailwind CSS 4 existente, CSS Modules, lucide-react, Canvas 2D y Node 24 test runner.

## Global Constraints

- El alcance de producto es solo `/assistant/new`; no crear `/references` ni cambiar el aspecto de `/assistant/[id]`.
- No modificar autenticación, NextAuth, Prisma, migraciones, APIs, email, Stripe, variables de entorno, navegación global, `app/layout.tsx`, `app/globals.css` ni `next.config.ts`.
- No instalar dependencias, React Router, Vite, framer-motion, shadcn/ui ni otra librería de animación.
- Usar Google Sans Flex ya cargada y CSS Module local.
- Mantener `app/assistant/new/page.tsx` como Server Component.
- Usar `img` nativo para los assets remotos de `https://qclay.design/lovable/sixsense`.
- Respetar `prefers-reduced-motion`, teclado, focus visible y limpieza completa de frames, timers y listeners.
- La única marca `TODO` permitida es el comentario legal solicitado para sustituir `#terms` y `#privacy` cuando existan rutas reales.

---

## File Map

- Create `app/assistant/new/_components/pixel-grid-math.ts`: funciones puras y tipadas para shuffle, edge noise y pertenencia al blob.
- Create `app/assistant/new/_components/pixel-grid-math.test.ts`: pruebas Node test-first de las funciones matemáticas.
- Create `app/assistant/new/_components/PixelGrid.tsx`: carga de sprites, raster offscreen, canvas DPR, reveal, flicker y pointer.
- Create `app/assistant/new/_components/AnimatedSendButton.tsx`: aro, easing de velocidad, brillo y swap de flecha.
- Create `app/assistant/new/_components/AssistantNewExperience.tsx`: composición, prompt, typewriter y toolbar funcional.
- Create `app/assistant/new/assistant-new.module.css`: layout, medidas exactas, animaciones, responsive y reduced motion.
- Modify `app/assistant/[id]/_components/ChatView.tsx`: exponer la variante `emptyExperience` y pasar callbacks/preferencias reales.
- Modify `app/assistant/new/page.tsx`: activar `emptyExperience="references"`.
- Create `public/tiles/tile-empty.svg` y `tile-1.svg` a `tile-5.svg`: familia original de sprites 32x32.

---

### Task 1: Pixel-grid math with native TypeScript tests

**Files:**
- Create: `app/assistant/new/_components/pixel-grid-math.test.ts`
- Create: `app/assistant/new/_components/pixel-grid-math.ts`

**Interfaces:**
- Produces `CellCoordinate`, `shuffleIndices(length, random)`, `edgeNoise(x, y, time)`, `organicRadius(angle, time, noise)` and `isInsideHoverBlob(cellX, cellY, pointerX, pointerY, time, noise)`.
- `PixelGrid.tsx` consumes all five exports.

- [ ] **Step 1: Write the failing tests**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import {
  edgeNoise,
  isInsideHoverBlob,
  organicRadius,
  shuffleIndices,
} from "./pixel-grid-math.ts";

test("shuffleIndices returns each index exactly once", () => {
  const values = [0.9, 0.1, 0.7, 0.2, 0.4];
  let cursor = 0;
  const shuffled = shuffleIndices(6, () => values[cursor++ % values.length]);
  assert.deepEqual([...shuffled].sort((a, b) => a - b), [0, 1, 2, 3, 4, 5]);
});

test("edgeNoise is deterministic for the same cell and time", () => {
  assert.equal(edgeNoise(4, 7, 1234), edgeNoise(4, 7, 1234));
});

test("organicRadius follows the approved modulation formula", () => {
  const angle = Math.PI / 3;
  const time = 850;
  const noise = 0.4;
  const expected = (
    Math.sin(angle * 3 + time * 0.0011) * 0.55
    + Math.sin(angle * 5 - time * 0.0017 + 1.3) * 0.30
    + Math.sin(angle * 2 + time * 0.0007 + 2.1) * 0.20
  ) * (0.95 + noise * 0.30);
  assert.equal(organicRadius(angle, time, noise), expected);
});

test("center cells are inside the four-cell hover blob", () => {
  assert.equal(isInsideHoverBlob(5, 5, 5, 5, 0, 0.5), true);
  assert.equal(isInsideHoverBlob(12, 12, 5, 5, 0, 0.5), false);
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `node --test app/assistant/new/_components/pixel-grid-math.test.ts`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `pixel-grid-math.ts`.

- [ ] **Step 3: Implement the pure helpers**

```ts
export interface CellCoordinate {
  x: number;
  y: number;
}

export function shuffleIndices(length: number, random: () => number = Math.random): number[] {
  const indices = Array.from({ length }, (_, index) => index);
  for (let index = indices.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [indices[index], indices[swapIndex]] = [indices[swapIndex], indices[index]];
  }
  return indices;
}

export function edgeNoise(x: number, y: number, time: number): boolean {
  return (Math.sin(x * 12.9898 + y * 78.233 + time * 0.002) + 1) * 0.5 > 0.45;
}

export function organicRadius(angle: number, time: number, noise: number): number {
  const modulation =
    Math.sin(angle * 3 + time * 0.0011) * 0.55
    + Math.sin(angle * 5 - time * 0.0017 + 1.3) * 0.30
    + Math.sin(angle * 2 + time * 0.0007 + 2.1) * 0.20;
  return modulation * (0.95 + noise * 0.30);
}

export function isInsideHoverBlob(
  cellX: number,
  cellY: number,
  pointerX: number,
  pointerY: number,
  time: number,
  noise: number,
): boolean {
  const dx = cellX - pointerX;
  const dy = cellY - pointerY;
  const distance = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx);
  const rMax = 4 + organicRadius(angle, time, noise);
  if (distance <= rMax - 0.5) return true;
  return distance <= rMax + 0.4 && edgeNoise(cellX, cellY, time);
}
```

- [ ] **Step 4: Run GREEN and type checking**

Run: `node --test app/assistant/new/_components/pixel-grid-math.test.ts`

Expected: 4 tests pass, 0 fail.

Run: `npx tsc --noEmit`

Expected: exit 0.

- [ ] **Step 5: Commit the pure logic**

```bash
git add app/assistant/new/_components/pixel-grid-math.ts app/assistant/new/_components/pixel-grid-math.test.ts
git commit -m "test: define assistant pixel grid math"
```

### Task 2: Local tile sprites and PixelGrid client island

**Files:**
- Create: `public/tiles/tile-empty.svg`
- Create: `public/tiles/tile-1.svg`
- Create: `public/tiles/tile-2.svg`
- Create: `public/tiles/tile-3.svg`
- Create: `public/tiles/tile-4.svg`
- Create: `public/tiles/tile-5.svg`
- Create: `app/assistant/new/_components/PixelGrid.tsx`

**Interfaces:**
- Consumes math helpers from Task 1.
- Produces `PixelGrid({ side }: { side: "left" | "right" })`.

- [ ] **Step 1: Create the six 32x32 SVG sprites**

Use a transparent or softly filled 32x32 rounded square in every file. `tile-empty.svg` uses a subtle `#DDE5F0` border and transparent center. Tiles 1-5 use distinct approved blue compositions built from `#B8D5FA`, `#8DBBF5`, `#70A8F2`, `#5085CE` and `#3D82DE`; each SVG must declare `viewBox="0 0 32 32"`, `width="32"` and `height="32"`.

Run: `for f in public/tiles/tile-empty.svg public/tiles/tile-{1..5}.svg; do test -s "$f" || exit 1; done`

Expected: exit 0.

- [ ] **Step 2: Implement `PixelGrid.tsx`**

Implementation contract:

```ts
"use client";

import { useEffect, useRef } from "react";
import styles from "../assistant-new.module.css";
import { isInsideHoverBlob, shuffleIndices } from "./pixel-grid-math";

const COLS = 12;
const ROWS = 16;
const TILE = 32;
const GAP = 1;
const TOTAL = COLS * ROWS;
const WIDTH = COLS * TILE + (COLS - 1) * GAP;
const HEIGHT = ROWS * TILE + (ROWS - 1) * GAP;
const SPRITE_PATHS = [
  "/tiles/tile-empty.svg",
  "/tiles/tile-1.svg",
  "/tiles/tile-2.svg",
  "/tiles/tile-3.svg",
  "/tiles/tile-4.svg",
  "/tiles/tile-5.svg",
] as const;

let spritePromise: Promise<HTMLCanvasElement[]> | null = null;

function loadSprites(): Promise<HTMLCanvasElement[]> {
  if (spritePromise) return spritePromise;
  spritePromise = Promise.all(SPRITE_PATHS.map((src) => new Promise<HTMLCanvasElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = TILE;
      canvas.height = TILE;
      canvas.getContext("2d")?.drawImage(image, 0, 0, TILE, TILE);
      resolve(canvas);
    };
    image.onerror = () => reject(new Error(`Unable to load pixel sprite: ${src}`));
    image.src = src;
  })));
  return spritePromise;
}

export default function PixelGrid({ side }: { side: "left" | "right" }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(WIDTH * dpr);
    canvas.height = Math.round(HEIGHT * dpr);
    canvas.style.width = `${WIDTH}px`;
    canvas.style.height = `${HEIGHT}px`;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const base = Array.from({ length: TOTAL }, () => Math.random() < 0.35);
    const visible = reducedMotion ? [...base] : Array<boolean>(TOTAL).fill(false);
    const tileVariants = Uint8Array.from({ length: TOTAL }, () => 1 + Math.floor(Math.random() * 5));
    const hoverSet = new Set<number>();
    const hoverValues = new Map<number, boolean>();
    let sprites: HTMLCanvasElement[] = [];
    let disposed = false;
    let revealFrame = 0;
    let pointerFrame = 0;
    let ambientTimer: ReturnType<typeof setTimeout> | undefined;
    let hoverTimer: ReturnType<typeof setTimeout> | undefined;
    let pointer = { x: Number.NEGATIVE_INFINITY, y: Number.NEGATIVE_INFINITY };

    const paint = () => {
      context.clearRect(0, 0, WIDTH, HEIGHT);
      if (sprites.length !== SPRITE_PATHS.length) return;
      for (let index = 0; index < TOTAL; index += 1) {
        const x = index % COLS;
        const y = Math.floor(index / COLS);
        const hoveredValue = hoverValues.get(index);
        const isOn = hoveredValue ?? visible[index];
        const sprite = sprites[isOn ? tileVariants[index] : 0];
        context.drawImage(sprite, x * (TILE + GAP), y * (TILE + GAP), TILE, TILE);
      }
    };

    const reconcileHover = (time: number) => {
      hoverSet.clear();
      hoverValues.clear();
      const rect = canvas.getBoundingClientRect();
      const localX = ((pointer.x - rect.left) / rect.width) * WIDTH / (TILE + GAP);
      const localY = ((pointer.y - rect.top) / rect.height) * HEIGHT / (TILE + GAP);
      for (let index = 0; index < TOTAL; index += 1) {
        const x = index % COLS;
        const y = Math.floor(index / COLS);
        const noise = (Math.sin(index * 91.771 + 17.13) + 1) * 0.5;
        if (isInsideHoverBlob(x, y, localX, localY, time, noise)) {
          hoverSet.add(index);
          hoverValues.set(index, Math.random() < 0.7);
        }
      }
      paint();
    };

    const onPointerMove = (event: PointerEvent) => {
      pointer = { x: event.clientX, y: event.clientY };
      if (pointerFrame) return;
      pointerFrame = requestAnimationFrame((time) => {
        pointerFrame = 0;
        reconcileHover(time);
      });
    };

    const scheduleAmbient = () => {
      ambientTimer = setTimeout(() => {
        const candidates = shuffleIndices(TOTAL).filter((index) => !hoverSet.has(index));
        for (const index of candidates.slice(0, 3)) {
          base[index] = Math.random() < 0.35;
          visible[index] = base[index];
          tileVariants[index] = 1 + Math.floor(Math.random() * 5);
        }
        paint();
        scheduleAmbient();
      }, 120 + Math.random() * 180);
    };

    const scheduleHover = () => {
      hoverTimer = setTimeout(() => {
        const hovered = shuffleIndices(hoverSet.size).map((offset) => [...hoverSet][offset]);
        const count = Math.round(hovered.length * 0.18);
        for (const index of hovered.slice(0, count)) {
          hoverValues.set(index, Math.random() < 0.7);
          tileVariants[index] = 1 + Math.floor(Math.random() * 5);
        }
        paint();
        scheduleHover();
      }, 70 + Math.random() * 90);
    };

    void loadSprites().then((loaded) => {
      if (disposed) return;
      sprites = loaded;
      if (reducedMotion) {
        paint();
        return;
      }

      const order = shuffleIndices(TOTAL);
      let cursor = 0;
      const reveal = () => {
        for (let count = 0; count < Math.ceil(TOTAL / 18) && cursor < TOTAL; count += 1) {
          const index = order[cursor++];
          visible[index] = base[index];
        }
        paint();
        if (cursor < TOTAL) revealFrame = requestAnimationFrame(reveal);
      };
      revealFrame = requestAnimationFrame(reveal);
      window.addEventListener("pointermove", onPointerMove, { passive: true });
      scheduleAmbient();
      scheduleHover();
    }).catch(() => {
      context.clearRect(0, 0, WIDTH, HEIGHT);
    });

    return () => {
      disposed = true;
      window.removeEventListener("pointermove", onPointerMove);
      if (revealFrame) cancelAnimationFrame(revealFrame);
      if (pointerFrame) cancelAnimationFrame(pointerFrame);
      if (ambientTimer) clearTimeout(ambientTimer);
      if (hoverTimer) clearTimeout(hoverTimer);
    };
  }, []);
  return <canvas ref={canvasRef} aria-hidden="true" className={`${styles.pixelGrid} ${styles[side]}`} />;
}
```

Fill the effect with these exact behaviors: DPR `min(devicePixelRatio, 2)`, base fill `0.35`, `ceil(TOTAL / 18)` reveal cells per frame, ambient delay 120-300ms toggling three non-hover cells, window pointer processing throttled through one RAF, hover fill `0.7`, hover rerandomization of `round(hoverSet.size * 0.18)` cells every 70-160ms, and immediate stable paint for reduced motion. Drawing chooses one of sprites 1-5 per active cell and sprite 0 otherwise.

- [ ] **Step 3: Verify component type safety**

Run: `npx tsc --noEmit`

Expected: exit 0 with no `any` introduced by the new files.

- [ ] **Step 4: Commit canvas and assets**

```bash
git add public/tiles app/assistant/new/_components/PixelGrid.tsx
git commit -m "feat: add animated assistant pixel grids"
```

### Task 3: Animated send control and complete empty-state experience

**Files:**
- Create: `app/assistant/new/_components/AnimatedSendButton.tsx`
- Create: `app/assistant/new/_components/AssistantNewExperience.tsx`
- Create: `app/assistant/new/assistant-new.module.css`

**Interfaces:**
- Produces `AnimatedSendButton({ disabled, onClick })`.
- Produces `AssistantNewExperienceProps` with `onSend`, `disabled`, `model`, `onModelChange`, `preferredKey`, and `onKeyChange` matching `ChatView`.
- Consumes `PixelGrid` and existing `ModelSelector`.

- [ ] **Step 1: Implement `AnimatedSendButton.tsx`**

Use a semantic `button`, refs for angle/speed/frame/timestamp, `arrowToggle` state only for per-entry shine, and the approved easing formula:

```ts
const targetSpeed = active ? 360 / 1500 : 0;
const tau = active ? 250 : 700;
const k = 1 - Math.exp(-deltaTime / tau);
speed += (targetSpeed - speed) * k;
angle = (angle + speed * deltaTime) % 360;
ring.style.setProperty("--ring-angle", `${angle}deg`);
```

The RAF stops when target speed is zero and `Math.abs(speed) < 0.0005`. Cleanup cancels the frame. Hover and focus share the active path. The JSX includes halo, inner square, static fallback border, conic ring, dots asset, keyed shine, outgoing arrow and incoming arrow from `${A}/arrow-up.svg`.

- [ ] **Step 2: Implement `AssistantNewExperience.tsx`**

Define exact props:

```ts
interface AssistantNewExperienceProps {
  onSend: (content: string) => void;
  disabled: boolean;
  model: string;
  onModelChange: (id: string) => void;
  preferredKey: "1" | "2";
  onKeyChange: (key: "1" | "2") => void;
}
```

Implement one textarea value, one hovered-card index, one focus boolean and one typewriter timeout. Use the five approved phrases, typing delay `22 + Math.random() * 25`, completion pause `1400`, deletion delay `14`, and full timeout cleanup. Submit trimmed content on Enter without Shift and through `AnimatedSendButton`.

Render, in order: two `PixelGrid`s, folder/light layers, three focusable card buttons with images, exact heading, exact subtitle, prompt wrapper, textarea/typewriter overlay, styled existing `ModelSelector`, compact key toggle when applicable, secondary asset controls, divider, add button, UI Design tag, send button and legal footer.

- [ ] **Step 3: Implement the scoped CSS Module**

Create selectors for every element, using the values in the approved design spec. Required keyframes: `layerFade`, `layerRise`, `cardEntrance1`, `cardEntrance2`, `cardEntrance3`, `floatCard1`, `floatCard2`, `floatCard3`, `headingEnter`, `subtitleEnter`, `promptEnter`, `promptCaretBlink`, `sendShine`, `arrowOut` and `arrowIn`.

Required media blocks:

```css
@media (max-width: 767px) {
  .experience { padding-inline: 16px; }
  .right { display: none; }
  .heading { font-size: 28px; line-height: 29px; }
  .secondaryControl, .divider, .tag { display: none; }
}

@media (max-height: 720px) {
  .experience { overflow-y: auto; justify-content: flex-start; }
  .footer { position: relative; bottom: auto; margin-top: 28px; }
}

@media (prefers-reduced-motion: reduce) {
  .experience *, .experience *::before, .experience *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

@media (prefers-reduced-transparency: reduce) {
  .promptOuter { background: #e4ebf5; backdrop-filter: none; }
}
```

All styles stay under `.experience`; no `html`, `body` or global selector is allowed. Focus uses `:focus-visible` with a visible blue outline. Use the exact `#EEF1F7` background, 702px prompt, 32px desktop heading, 28px mobile heading, 20px inner prompt radius and 24px outer radius.

- [ ] **Step 4: Verify test, type and lint before integration**

Run: `node --test app/assistant/new/_components/pixel-grid-math.test.ts`

Expected: 4 pass, 0 fail.

Run: `npx tsc --noEmit && npm run lint -- app/assistant/new`

Expected: exit 0.

- [ ] **Step 5: Commit the visual component**

```bash
git add app/assistant/new/_components/AnimatedSendButton.tsx app/assistant/new/_components/AssistantNewExperience.tsx app/assistant/new/assistant-new.module.css
git commit -m "feat: build assistant new empty experience"
```

### Task 4: Integrate only `/assistant/new` with existing chat behavior

**Files:**
- Modify: `app/assistant/[id]/_components/ChatView.tsx`
- Modify: `app/assistant/new/page.tsx`

**Interfaces:**
- Extend `Props` with `emptyExperience?: "references"`.
- `AssistantNewPage` passes `emptyExperience="references"`.

- [ ] **Step 1: Extend `ChatView` without changing conversation rendering**

Import `AssistantNewExperience` and add `emptyExperience?: "references"` to `Props`. Before the existing return, add:

```tsx
if (isEmpty && emptyExperience === "references") {
  return (
    <AssistantNewExperience
      onSend={sendMessage}
      disabled={streaming}
      model={model}
      onModelChange={switchModel}
      preferredKey={preferredKey}
      onKeyChange={switchKey}
    />
  );
}
```

Do not change message mapping, retry behavior, streaming loop, conversation creation or the existing empty state fallback.

- [ ] **Step 2: Activate the variant only in the new route**

Change the render in `app/assistant/new/page.tsx` to:

```tsx
return (
  <ChatView
    conversationId="new"
    initialMessages={[]}
    emptyExperience="references"
  />
);
```

- [ ] **Step 3: Verify route isolation**

Run: `rg -n 'emptyExperience' app/assistant`

Expected: definitions in `ChatView.tsx` and exactly one activation in `app/assistant/new/page.tsx`.

Run: `npx tsc --noEmit && npm run lint -- app/assistant`

Expected: exit 0.

- [ ] **Step 4: Commit integration**

```bash
git add app/assistant/new/page.tsx app/assistant/'[id]'/_components/ChatView.tsx
git commit -m "feat: activate visual experience for assistant new"
```

### Task 5: Full verification and responsive QA

**Files:**
- Modify only new Assistant files if verification finds an implementation-caused issue.

**Interfaces:**
- No new interfaces. This task proves the completed user flow and isolation.

- [ ] **Step 1: Run automated verification**

Run: `node --test app/assistant/new/_components/pixel-grid-math.test.ts`

Expected: 4 pass, 0 fail.

Run: `npm run lint`

Expected: exit 0 with no errors.

Run: `npm run build`

Expected: exit 0 and `/assistant/new` present in the route manifest.

- [ ] **Step 2: Start production server and verify breakpoints**

Run: `npm run start`

Using browser devtools, verify authenticated `/assistant/new` at 320 × 800, 768 × 1024 and 1440 × 900. Capture screenshots for each size. Confirm no horizontal overflow, prompt visibility, un-clipped cards and non-overlapping footer.

- [ ] **Step 3: Verify functional flow and isolation**

At `/assistant/new`, type a real prompt and submit. Confirm POST to `/api/assistant/conversations`, URL replacement to `/assistant/[id]`, assistant streaming and the existing conversation UI. Reload the conversation, open another existing conversation, and open `/assistant`; confirm their pre-existing behavior and appearance.

- [ ] **Step 4: Verify accessibility and cleanup**

Enable reduced motion before loading the route. Confirm stable canvas, no typewriter, no floating cards, no shine/spin and full keyboard usability. Navigate away and confirm no further timer callbacks, RAF work or pointer drawing in the Performance panel.

- [ ] **Step 5: Run the design pre-flight and final diff audit**

Check page copy, one light theme, one blue accent, radius system, button contrast, focus states, 320px collapse, no em-dash in visible copy, no duplicate navigation and no files outside the approved scope except docs and `public/tiles`.

Run: `git status --short && git diff --check && git diff --stat HEAD~4..HEAD`

Expected: only the planned files, no whitespace errors.

- [ ] **Step 6: Commit verification fixes if any**

```bash
git add app/assistant/new app/assistant/'[id]'/_components/ChatView.tsx public/tiles
git commit -m "fix: polish assistant new responsive experience"
```

Skip this commit when no verification fix was required.
