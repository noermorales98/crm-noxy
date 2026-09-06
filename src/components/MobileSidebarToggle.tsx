"use client";

import { PanelLeftOpen } from "lucide-react";
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
      className={`flex size-8 shrink-0 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-nav-hover hover:text-text-primary lg:hidden ${className}`}
    >
      <PanelLeftOpen size={18} strokeWidth={1.8} aria-hidden="true" />
    </button>
  );
}
