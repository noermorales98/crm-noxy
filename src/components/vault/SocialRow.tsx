"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Delete02Icon } from "@hugeicons/core-free-icons";
import { SOCIAL_PLATFORMS } from "./constants";

export default function SocialRow({
  entry,
  onDelete,
}: {
  entry: any;
  onDelete: (id: string) => void;
}) {
  const platform =
    SOCIAL_PLATFORMS.find((p) => p.value === entry.label) ||
    SOCIAL_PLATFORMS[SOCIAL_PLATFORMS.length - 1];

  return (
    <div className="group/social flex items-center gap-3 bg-white border border-border-subtle rounded-lg px-4 py-3 hover:border-border-subtle transition-colors">
      <div className={`shrink-0 ${platform.color}`}>
        <HugeiconsIcon icon={platform.icon} size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-text-secondary">{platform.label}</p>
        <a
          href={entry.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-500 hover:underline truncate block"
        >
          {entry.url}
        </a>
      </div>
      <button
        onClick={() => onDelete(entry.id)}
        className="opacity-0 group-hover/social:opacity-100 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
      >
        <HugeiconsIcon icon={Delete02Icon} size={13} />
      </button>
    </div>
  );
}
