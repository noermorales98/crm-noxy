"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Menu01Icon } from "@hugeicons/core-free-icons";
import { useOptionalMobileChrome } from "@/src/context/MobileChromeContext";

export default function MobileSidebarToggle({
  className = "",
}: {
  className?: string;
}) {
  const mobileChrome = useOptionalMobileChrome();
  if (!mobileChrome) return null;

  return (
    <button
      type="button"
      aria-label="Mostrar barra lateral"
      aria-controls="assistant-sidebar"
      onClick={() => mobileChrome.openMobileSidebar()}
      className={`flex size-11 shrink-0 items-center justify-center rounded-control text-text-secondary transition-colors hover:bg-surface-elevated/60 hover:text-text-primary lg:hidden ${className}`}
    >
      <HugeiconsIcon icon={Menu01Icon} size={20} aria-hidden="true" />
    </button>
  );
}
