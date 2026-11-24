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
    <span className={className} aria-hidden="true" style={{ display: "inline-flex", flexShrink: 0, position: "relative" }}>
      <Blobatar ref={ref} name={seed} size={size} animate="always" expression={MOODS[mood]} />
      {/* Mientras piensa: tres puntos que laten debajo de la cara (como el estado «thinking» del presence-avatar de blobatar). */}
      {mood === "thinking" && (
        <span style={{ position: "absolute", left: "50%", bottom: -Math.max(4, size * 0.1), transform: "translateX(-50%)", display: "flex", gap: Math.max(3, size * 0.06) }}>
          {[0, 1, 2].map((i) => (
            <i
              key={i}
              className="animate-pulse motion-reduce:animate-none"
              style={{ width: Math.max(4, size * 0.09), height: Math.max(4, size * 0.09), borderRadius: "50%", background: "#6E6E73", animationDuration: "1.1s", animationDelay: `${i * 150}ms` }}
            />
          ))}
        </span>
      )}
    </span>
  );
}
