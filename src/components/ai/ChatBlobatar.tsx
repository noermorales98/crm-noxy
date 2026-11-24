"use client";

import { Blobatar } from "@blobatar/react";
import { useGaze } from "@blobatar/react/gaze";
import { happy, idle, thinking } from "blobatar/expression";
import "blobatar/motion.css";
import "blobatar/gaze.css";

export type BlobMood = "idle" | "thinking" | "happy";

const MOODS = { idle, thinking, happy } as const;

/** Semilla al azar para un chat nuevo (cada chat tiene su propia criatura). */
export function randomBlobSeed(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

/**
 * La criatura del chat: una cara geométrica distinta por conversación que parpadea, mira el cursor y reacciona
 * (pensando mientras la IA responde, contenta al terminar). Decorativa: el estado real se anuncia en el texto.
 */
export default function ChatBlobatar({ seed, size = 40, mood = "idle", follow = false, className }: { seed: string; size?: number; mood?: BlobMood; follow?: boolean; className?: string }) {
  const { ref } = useGaze({ travel: size >= 64 ? 3.5 : 2.5, lookAt: follow ? "pointer" : undefined });
  return (
    <span className={className} aria-hidden="true" style={{ display: "inline-flex", flexShrink: 0 }}>
      <Blobatar ref={ref} name={seed} size={size} animate="always" expression={MOODS[mood]} />
    </span>
  );
}
