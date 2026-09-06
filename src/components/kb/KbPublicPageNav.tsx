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
        className="fixed inset-x-0 top-0 z-50 border-b border-border-subtle bg-white/95 backdrop-blur-md md:hidden"
        aria-label="Navegación entre documentos"
      >
        <div className="crm-safe-top">
          <div className="flex h-12 items-center gap-1 px-2">
            <NavButton
              href={prevHref}
              disabled={!nav.prev}
              label={nav.prev ? `Anterior: ${nav.prev.title}` : "Sin documento anterior"}
              className="size-9 shrink-0 text-text-primary hover:bg-black/5"
            >
              <ChevronLeft size={18} />
            </NavButton>

            <div className="flex min-w-0 flex-1 flex-col items-center px-1">
              <Link
                href={homeHref}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-text-secondary transition-colors hover:bg-black/5 hover:text-text-primary"
                title={folderTitle ? `Volver a ${folderTitle}` : "Inicio de la carpeta"}
              >
                <Home size={12} />
                <span className="truncate max-w-[10rem]">{folderTitle || "Inicio"}</span>
              </Link>
              <p className="mt-0.5 text-[10px] tabular-nums text-text-secondary">
                {nav.index + 1} / {nav.total}
              </p>
            </div>

            <NavButton
              href={nextHref}
              disabled={!nav.next}
              label={nav.next ? `Siguiente: ${nav.next.title}` : "Sin documento siguiente"}
              className="size-9 shrink-0 text-text-primary hover:bg-black/5"
            >
              <ChevronRight size={18} />
            </NavButton>
          </div>
        </div>
      </nav>

      {/* Spacer so content clears the fixed mobile navbar */}
      <div className="h-[calc(3rem+env(safe-area-inset-top,0px))] shrink-0 md:hidden" aria-hidden />

      {/* Desktop floating buttons — fixed, vertically centered in viewport */}
      {nav.prev && (
        <Link
          href={prevHref!}
          className={`hidden md:flex fixed top-1/2 -translate-y-1/2 z-40 w-11 h-11 items-center justify-center rounded-full bg-white border border-border-subtle shadow-sm text-text-primary hover:bg-nav-hover transition-colors ${desktopPrevLeft}`}
          title={`Anterior: ${nav.prev.title}`}
          aria-label={`Anterior: ${nav.prev.title}`}
        >
          <ChevronLeft size={20} />
        </Link>
      )}
      {nav.next && (
        <Link
          href={nextHref!}
          className="hidden md:flex fixed top-1/2 -translate-y-1/2 right-6 z-40 w-11 h-11 items-center justify-center rounded-full bg-white border border-border-subtle shadow-sm text-text-primary hover:bg-nav-hover transition-colors"
          title={`Siguiente: ${nav.next.title}`}
          aria-label={`Siguiente: ${nav.next.title}`}
        >
          <ChevronRight size={20} />
        </Link>
      )}
    </>
  );
}
