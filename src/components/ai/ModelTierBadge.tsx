import type { ModelTier } from "@/src/lib/ai-model-info";
import { tierLabel } from "@/src/lib/ai-model-info";

const STYLE: Record<ModelTier, string> = {
  powerful: "bg-nav-active text-[var(--nav-active-ink)]",
  balanced: "bg-nav-hover text-text-secondary-strong",
  light: "bg-success-soft text-success",
};

/** Etiqueta del nivel de un modelo: Potente, Equilibrado o Ligero. */
export default function ModelTierBadge({ tier, className = "" }: { tier: ModelTier; className?: string }) {
  return <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-semibold ${STYLE[tier]} ${className}`}>{tierLabel(tier)}</span>;
}
