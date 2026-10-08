"use client";

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
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.8}
        stroke="currentColor"
        className="size-[18px]"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" />
      </svg>
    </button>
  );
}
