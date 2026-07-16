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

  const pendingSprites = Promise.all(
    SPRITE_PATHS.map(
      (src) =>
        new Promise<HTMLCanvasElement>((resolve, reject) => {
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
        }),
    ),
  );
  spritePromise = pendingSprites.catch((error: unknown) => {
    spritePromise = null;
    throw error;
  });
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

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const base = Array.from({ length: TOTAL }, () => Math.random() < 0.35);
    const visible = motionQuery.matches ? [...base] : Array<boolean>(TOTAL).fill(false);
    const tileVariants = Uint8Array.from(
      { length: TOTAL },
      () => 1 + Math.floor(Math.random() * 5),
    );
    const hoverVariants = Uint8Array.from(
      { length: TOTAL },
      () => 1 + Math.floor(Math.random() * 5),
    );
    const hoverSet = new Set<number>();
    const hoverValues = new Map<number, boolean>();
    let sprites: HTMLCanvasElement[] = [];
    let disposed = false;
    let interactive = false;
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
        const variant = hoveredValue === undefined ? tileVariants[index] : hoverVariants[index];
        const sprite = sprites[isOn ? variant : 0];
        context.drawImage(sprite, x * (TILE + GAP), y * (TILE + GAP), TILE, TILE);
      }
    };

    const stopHover = () => {
      if (!hoverTimer) return;
      clearTimeout(hoverTimer);
      hoverTimer = undefined;
    };

    const scheduleHover = () => {
      if (!interactive || hoverTimer || hoverSet.size === 0) return;
      hoverTimer = setTimeout(() => {
        hoverTimer = undefined;
        if (!interactive || hoverSet.size === 0) return;

        const hovered = shuffleIndices(hoverSet.size).map((offset) => [...hoverSet][offset]);
        const count = Math.round(hovered.length * 0.18);
        for (const index of hovered.slice(0, count)) {
          hoverValues.set(index, Math.random() < 0.7);
          hoverVariants[index] = 1 + Math.floor(Math.random() * 5);
        }
        paint();
        scheduleHover();
      }, 70 + Math.random() * 90);
    };

    const reconcileHover = (time: number) => {
      const hadHoveredCells = hoverSet.size > 0;
      const nextHoverSet = new Set<number>();
      const rect = canvas.getBoundingClientRect();
      const localX = ((pointer.x - rect.left) / rect.width) * WIDTH / (TILE + GAP);
      const localY = ((pointer.y - rect.top) / rect.height) * HEIGHT / (TILE + GAP);

      for (let index = 0; index < TOTAL; index += 1) {
        const x = index % COLS;
        const y = Math.floor(index / COLS);
        const noise = (Math.sin(index * 91.771 + 17.13) + 1) * 0.5;
        if (isInsideHoverBlob(x, y, localX, localY, time, noise)) {
          nextHoverSet.add(index);
        }
      }

      for (const index of hoverSet) {
        if (nextHoverSet.has(index)) continue;
        hoverSet.delete(index);
        hoverValues.delete(index);
      }
      for (const index of nextHoverSet) {
        if (!hoverSet.has(index)) {
          hoverValues.set(index, Math.random() < 0.7);
          hoverVariants[index] = 1 + Math.floor(Math.random() * 5);
        }
        hoverSet.add(index);
      }

      if (hoverSet.size === 0) {
        stopHover();
      } else if (!hadHoveredCells) {
        scheduleHover();
      }
      paint();
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!interactive) return;
      pointer = { x: event.clientX, y: event.clientY };
      if (pointerFrame) return;

      pointerFrame = requestAnimationFrame((time) => {
        pointerFrame = 0;
        reconcileHover(time);
      });
    };

    const scheduleAmbient = () => {
      if (!interactive || ambientTimer) return;
      ambientTimer = setTimeout(() => {
        ambientTimer = undefined;
        if (!interactive) return;

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

    const stopInteractive = () => {
      interactive = false;
      window.removeEventListener("pointermove", onPointerMove);

      if (revealFrame) cancelAnimationFrame(revealFrame);
      revealFrame = 0;
      if (pointerFrame) cancelAnimationFrame(pointerFrame);
      pointerFrame = 0;
      if (ambientTimer) clearTimeout(ambientTimer);
      ambientTimer = undefined;
      if (hoverTimer) clearTimeout(hoverTimer);
      hoverTimer = undefined;

      pointer = { x: Number.NEGATIVE_INFINITY, y: Number.NEGATIVE_INFINITY };
      hoverSet.clear();
      hoverValues.clear();
      for (let index = 0; index < TOTAL; index += 1) {
        visible[index] = base[index];
      }
      paint();
    };

    const startInteractive = () => {
      if (
        disposed
        || interactive
        || motionQuery.matches
        || sprites.length !== SPRITE_PATHS.length
      ) {
        return;
      }

      interactive = true;
      visible.fill(false);
      paint();

      const order = shuffleIndices(TOTAL);
      let cursor = 0;
      const reveal = () => {
        if (!interactive || disposed) {
          revealFrame = 0;
          return;
        }

        for (
          let count = 0;
          count < Math.ceil(TOTAL / 18) && cursor < TOTAL;
          count += 1
        ) {
          const index = order[cursor++];
          visible[index] = base[index];
        }
        paint();
        if (cursor < TOTAL) {
          revealFrame = requestAnimationFrame(reveal);
        } else {
          revealFrame = 0;
          scheduleAmbient();
        }
      };

      revealFrame = requestAnimationFrame(reveal);
      window.addEventListener("pointermove", onPointerMove, { passive: true });
    };

    const updateMotionPreference = () => {
      if (motionQuery.matches) {
        stopInteractive();
      } else {
        startInteractive();
      }
    };

    motionQuery.addEventListener("change", updateMotionPreference);
    updateMotionPreference();

    void loadSprites()
      .then((loaded) => {
        if (disposed) return;
        sprites = loaded;
        updateMotionPreference();
      })
      .catch(() => {
        if (disposed) return;
        context.clearRect(0, 0, WIDTH, HEIGHT);
      });

    return () => {
      disposed = true;
      motionQuery.removeEventListener("change", updateMotionPreference);
      stopInteractive();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`${styles.pixelGrid} ${styles[side]}`}
    />
  );
}
