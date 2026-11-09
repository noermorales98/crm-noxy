import type { ReactNode } from "react";
import { cn } from "./cn";

// DESIGN.md · Chips: Lavanda para neutral, Lima para énfasis (siempre con Obsidiana).
const TONES = {
  neutral: "border border-line text-text-secondary-strong",
  hot: "bg-highlight text-text-primary",
  late: "bg-danger-soft text-danger",
  done: "bg-success-soft text-success",
} as const;

export type ChipTone = keyof typeof TONES;

type ChipProps = {
  tone?: ChipTone;
  /** El texto es obligatorio: el estado nunca depende solo del color. */
  children: ReactNode;
};

export function Chip({ tone = "neutral", children }: ChipProps) {
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center whitespace-nowrap rounded-full px-2.5 text-xs font-semibold",
        TONES[tone],
      )}
    >
      {children}
    </span>
  );
}
