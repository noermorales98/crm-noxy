"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import {
  getHugeIconComponent,
  parseHugeIconName,
  defaultColorsForPage,
  defaultIconForNewPage,
  DEFAULT_ICON_COLOR,
  DEFAULT_ICON_BG,
} from "@/src/lib/kb-icons";

interface PageIconProps {
  emoji?: string | null;
  iconColor?: string | null;
  iconBg?: string | null;
  isFolder?: boolean;
  size?: number;
  fallback?: string;
  className?: string;
  /** Render icon inside a colored block (logo-style) */
  block?: boolean;
}

export default function PageIcon({
  emoji,
  iconColor,
  iconBg,
  isFolder = false,
  size = 20,
  fallback = "📄",
  className = "",
  block = false,
}: PageIconProps) {
  const defaults = defaultColorsForPage(isFolder);
  const fg = iconColor || defaults.iconColor;
  const bg = iconBg || defaults.iconBg;
  const blockSize = Math.max(size + 12, 28);

  const inner = (() => {
    const resolvedEmoji = emoji || defaultIconForNewPage(isFolder).emoji;
    const iconName = parseHugeIconName(resolvedEmoji);
    if (iconName) {
      const icon = getHugeIconComponent(iconName);
      if (!icon) {
        return <span className={className}>{fallback}</span>;
      }
      return <HugeiconsIcon icon={icon as never} size={size} color={fg} className={className} />;
    }

    if (resolvedEmoji) {
      return <span className={className} style={{ fontSize: size * 0.9, lineHeight: 1 }}>{resolvedEmoji}</span>;
    }

    return <span className={className}>{fallback}</span>;
  })();

  if (!block) return inner;

  return (
    <span
      className={`inline-flex items-center justify-center rounded-lg shrink-0 ${className}`}
      style={{ width: blockSize, height: blockSize, backgroundColor: bg }}
    >
      {inner}
    </span>
  );
}

export function PageIconColors({
  iconColor,
  iconBg,
  isFolder,
}: {
  iconColor?: string | null;
  iconBg?: string | null;
  isFolder?: boolean;
}) {
  const d = defaultColorsForPage(!!isFolder);
  return {
    iconColor: iconColor || d.iconColor,
    iconBg: iconBg || d.iconBg,
  };
}

export { DEFAULT_ICON_COLOR, DEFAULT_ICON_BG };
