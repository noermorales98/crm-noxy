"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import Sidebar from "@/src/components/Sidebar";
import {
  INITIAL_ASSISTANT_SIDEBAR_STATE,
  assistantNewSidebarReducer,
  getSidebarFocusTarget,
} from "./assistant-new-sidebar-state";
import { useOptionalMobileChrome } from "@/src/context/MobileChromeContext";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

const MOBILE_PANEL_BASE_CLASSES =
  "fixed left-3 top-[max(0.75rem,env(safe-area-inset-top))] z-[70] w-64 max-w-[calc(100vw-24px)] bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] transition-[transform,opacity] duration-200 motion-reduce:transition-none";
const MOBILE_OPEN_PANEL_CLASSES = `${MOBILE_PANEL_BASE_CLASSES} translate-x-0 opacity-100`;
const MOBILE_CLOSED_PANEL_CLASSES = `${MOBILE_PANEL_BASE_CLASSES} -translate-x-[calc(100%+32px)] opacity-0 pointer-events-none`;

// Controles del panel sobre el marco claro: sólidos, sin vidrio.
const FRAME_CONTROL_CLASSES =
  "border border-line bg-surface-sidebar text-text-primary transition-colors duration-200 hover:bg-surface-elevated motion-reduce:transition-none";

/**
 * Cajón de navegación móvil. En escritorio la navegación es la sidebar acoplada de siempre (también
 * en /assistant): ya no hay fijar, soltar ni vistazo al pasar el cursor.
 */
export default function AssistantSidebarShell() {
  const [state, dispatch] = useReducer(assistantNewSidebarReducer, INITIAL_ASSISTANT_SIDEBAR_STATE);
  const [isMobile, setIsMobile] = useState(false);
  const hideButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef(false);
  const openedByMobileButtonRef = useRef(false);
  // Control externo que abrió el panel móvil («Más» o el botón de menú): recupera el foco al cerrar.
  const mobileReturnFocusRef = useRef<HTMLElement | null>(null);
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  const mobileChrome = useOptionalMobileChrome();
  const isVisible = isMobile && state.peek;

  const hideSidebar = useCallback(() => {
    restoreFocusRef.current = true;
    dispatch({ type: "mobileClose" });
  }, []);

  // Elegir un destino cierra el panel móvil o el vistazo; la barra fijada se queda fija
  // (antes navegar la desfijaba: por eso «no quedaba fijo»).
  const closeForNavigation = useCallback(() => {
    restoreFocusRef.current = true;
    dispatch({ type: "mobileClose" });
  }, []);

  useEffect(() => {
    if (pathnameRef.current === pathname) return;
    pathnameRef.current = pathname;
    if (!isMobile) return;
    dispatch({ type: "mobileClose" });
  }, [isMobile, pathname]);

  const openFromMobileButton = useCallback(() => {
    openedByMobileButtonRef.current = true;
    mobileReturnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dispatch({ type: "mobileOpen" });
  }, []);

  useEffect(() => {
    if (!mobileChrome) return;
    mobileChrome.registerOpenMobileSidebar(openFromMobileButton);
    return () => mobileChrome.registerOpenMobileSidebar(null);
  }, [mobileChrome, openFromMobileButton]);

  useEffect(() => {
    if (isVisible && isMobile && openedByMobileButtonRef.current) {
      openedByMobileButtonRef.current = false;
      hideButtonRef.current?.focus();
      return;
    }

    if (!isVisible && mobileReturnFocusRef.current) {
      const target = mobileReturnFocusRef.current;
      mobileReturnFocusRef.current = null;
      if (target.isConnected) {
        restoreFocusRef.current = false;
        target.focus();
        return;
      }
      // Quien abrió el panel ya no existe (p. ej. la barra móvil en /assistant): foco de respaldo.
    }

    if (!isVisible) restoreFocusRef.current = false;
  }, [isMobile, isVisible]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 1023px)");
    const updateViewport = () => setIsMobile(mediaQuery.matches);

    updateViewport();
    mediaQuery.addEventListener("change", updateViewport);
    return () => mediaQuery.removeEventListener("change", updateViewport);
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    const handlePanelKeys = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        hideSidebar();
        return;
      }

      if (!isMobile || event.key !== "Tab") return;

      const focusableElements = Array.from(
        panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? [],
      ).filter((element) => element.getClientRects().length > 0);
      const currentIndex = focusableElements.indexOf(document.activeElement as HTMLElement);
      const targetIndex = getSidebarFocusTarget(
        currentIndex,
        focusableElements.length,
        event.shiftKey ? "backward" : "forward",
      );

      if (targetIndex === null) return;
      event.preventDefault();
      focusableElements[targetIndex]?.focus();
    };

    window.addEventListener("keydown", handlePanelKeys);
    return () => window.removeEventListener("keydown", handlePanelKeys);
  }, [hideSidebar, isMobile, isVisible]);

  // Móvil: cerrar en la esquina del panel.
  const mobileCloseControl = (
    <button
      ref={hideButtonRef}
      type="button"
      aria-label="Ocultar barra lateral"
      aria-expanded={isVisible}
      aria-controls="assistant-sidebar"
      onClick={hideSidebar}
      className={`absolute -right-4 top-3 z-10 flex size-11 items-center justify-center rounded-control ${FRAME_CONTROL_CLASSES}`}
    >
      <HugeiconsIcon icon={Cancel01Icon} size={17} aria-hidden="true" />
    </button>
  );

  if (isMobile) {
    return (
      <>
        {isVisible && (
          <button
            type="button"
            tabIndex={-1}
            aria-label="Ocultar barra lateral"
            onClick={hideSidebar}
            className="fixed inset-0 z-[60] bg-brand-obsidian/35"
          />
        )}

        <div
          ref={panelRef}
          id="assistant-sidebar"
          inert={!isVisible}
          aria-hidden={!isVisible}
          role={isVisible ? "dialog" : undefined}
          aria-modal={isVisible ? true : undefined}
          aria-label={isVisible ? "Barra lateral principal" : undefined}
          className={isVisible ? MOBILE_OPEN_PANEL_CLASSES : MOBILE_CLOSED_PANEL_CLASSES}
        >
          {mobileCloseControl}
          <Sidebar variant="floating" onNavigate={closeForNavigation} />
        </div>
      </>
    );
  }

  return null;
}
