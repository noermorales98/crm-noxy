"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import * as HugeIconsAll from "@hugeicons/core-free-icons";

/**
 * Renders a KB page icon.
 * - If emoji starts with "icon:Name" → renders the HugeIcon
 * - Otherwise renders the emoji character
 * - Falls back to the fallback prop (default "📄")
 */
export default function PageIcon({
  emoji,
  size = 20,
  fallback = "📄",
  className = "",
}: {
  emoji: string | null | undefined;
  size?: number;
  fallback?: string;
  className?: string;
}) {
  if (!emoji) return <span className={className}>{fallback}</span>;

  if (emoji.startsWith("icon:")) {
    const name = emoji.slice(5);
    const key = `${name}Icon`;
    const icon = (HugeIconsAll as any)[key];
    if (!icon) return <span className={className}>{fallback}</span>;
    return <HugeiconsIcon icon={icon} size={size} color="currentColor" className={className} />;
  }

  return <span className={className}>{emoji}</span>;
}
