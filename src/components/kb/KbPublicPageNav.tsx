"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, Home } from "lucide-react";
import type { PublicPageNav } from "@/src/lib/kb-public-nav";

interface KbPublicPageNavProps {
  token: string;
  nav: PublicPageNav;
  folderTitle?: string;
  hasLeftSidebar?: boolean;
}

function NavButton({
  href,
  disabled,
  label,
  children,
  className = "",
}: {
  href?: string;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  const base =
    "inline-flex items-center justify-center gap-1 rounded-lg text-xs font-medium transition-colors disabled:opacity-35 disabled:pointer-events-none";

  if (disabled || !href) {
    return (
      <span className={`${base} ${className}`} aria-disabled="true" title={label}>
        {children}
      </span>
    );
  }

  return (
    <Link href={href} className={`${base} ${className}`} title={label} aria-label={label}>
      {children}
    </Link>
  );
}

export default function KbPublicPageNav({
  token,
  nav,
  folderTitle,
  hasLeftSidebar = false,
}: KbPublicPageNavProps) {
  const homeHref = `/docs/s/${token}`;
  const prevHref = nav.prev ? `/docs/s/${token}/${nav.prev.id}` : undefined;
  const nextHref = nav.next ? `/docs/s/${token}/${nav.next.id}` : undefined;

  const desktopPrevLeft = hasLeftSidebar
    ? "md:left-[calc(18rem+0.75rem)] lg:left-[calc(20rem+0.75rem)]"
    : "md:left-6";

  return (
    <>
      {/* Mobile navbar — fixed at viewport top */}
      <nav
        className="md:hidden fixed top-0 inset-x-0 z-50 border-b border-black/5 bg-white/95 backdrop-blur-md"
        aria-label="Navegación entre documentos"
      >
        <div className="flex items-center gap-1 px-2 py-2.5">
          <NavButton
            href={prevHref}
            disabled={!nav.prev}
            label={nav.prev ? `Anterior: ${nav.prev.title}` : "Sin documento anterior"}
            className="shrink-0 px-2.5 py-2 text-text-primary hover:bg-black/5"
          >
            <ChevronLeft size={16} />
            <span>Atrás</span>
          </NavButton>

          <div className="flex-1 min-w-0 flex flex-col items-center px-1">
            <Link
              href={homeHref}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-text-secondary hover:text-text-primary hover:bg-black/5 transition-colors"
              title={folderTitle ? `Volver a ${folderTitle}` : "Inicio de la carpeta"}
            >
              <Home size={12} />
              <span>Inicio</span>
            </Link>
            <p className="text-[10px] text-text-secondary mt-0.5 tabular-nums">
              {nav.index + 1} / {nav.total}
            </p>
          </div>

          <NavButton
            href={nextHref}
            disabled={!nav.next}
            label={nav.next ? `Siguiente: ${nav.next.title}` : "Sin documento siguiente"}
            className="shrink-0 px-2.5 py-2 text-text-primary hover:bg-black/5"
          >
            <span>Adelante</span>
            <ChevronRight size={16} />
          </NavButton>
        </div>
      </nav>

      {/* Spacer so content clears the fixed mobile navbar */}
      <div className="md:hidden h-[52px] shrink-0" aria-hidden />

      {/* Desktop floating buttons — fixed, vertically centered in viewport */}
      {nav.prev && (
        <Link
          href={prevHref!}
          className={`hidden md:flex fixed top-1/2 -translate-y-1/2 z-40 w-11 h-11 items-center justify-center rounded-full bg-white/92 border border-black/8 shadow-md text-text-primary hover:bg-white hover:shadow-lg transition-all ${desktopPrevLeft}`}
          title={`Anterior: ${nav.prev.title}`}
          aria-label={`Anterior: ${nav.prev.title}`}
        >
          <ChevronLeft size={20} />
        </Link>
      )}
      {nav.next && (
        <Link
          href={nextHref!}
          className="hidden md:flex fixed top-1/2 -translate-y-1/2 right-6 z-40 w-11 h-11 items-center justify-center rounded-full bg-white/92 border border-black/8 shadow-md text-text-primary hover:bg-white hover:shadow-lg transition-all"
          title={`Siguiente: ${nav.next.title}`}
          aria-label={`Siguiente: ${nav.next.title}`}
        >
          <ChevronRight size={20} />
        </Link>
      )}
    </>
  );
}
