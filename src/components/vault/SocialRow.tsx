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
    <div className="group/social flex items-center gap-3 bg-surface-elevated border border-line rounded-lg px-4 py-3 hover:border-line transition-colors">
      <div className={`shrink-0 ${platform.color}`}>
        <HugeiconsIcon icon={platform.icon} size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-text-secondary">{platform.label}</p>
        <a
          href={entry.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block truncate text-sm leading-[44px] text-blue-600 hover:underline lg:leading-normal"
        >
          {entry.url}
        </a>
      </div>
      <button
        type="button"
        onClick={() => onDelete(entry.id)}
        aria-label="Eliminar enlace"
        className="flex size-11 shrink-0 items-center justify-center rounded-control text-text-secondary transition-all hover:bg-danger-soft hover:text-danger lg:size-8 lg:opacity-0 lg:group-hover/social:opacity-100 lg:focus-visible:opacity-100"
      >
        <HugeiconsIcon icon={Delete02Icon} size={16} />
      </button>
    </div>
  );
}
