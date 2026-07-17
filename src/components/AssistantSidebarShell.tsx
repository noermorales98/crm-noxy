"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { PanelLeftOpen, X } from "lucide-react";
import { usePathname } from "next/navigation";
import Sidebar from "@/src/components/Sidebar";
import {
  assistantNewSidebarReducer,
  getSidebarFocusTarget,
} from "./assistant-new-sidebar-state";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

const PANEL_BASE_CLASSES =
  "fixed bottom-3 left-3 top-3 z-[70] w-64 max-w-[calc(100vw-24px)] transition-[transform,opacity] duration-200 motion-reduce:transition-none";
const OPEN_PANEL_CLASSES = `${PANEL_BASE_CLASSES} translate-x-0 opacity-100`;
const CLOSED_PANEL_CLASSES = `${PANEL_BASE_CLASSES} -translate-x-[calc(100%+32px)] opacity-0 pointer-events-none`;

export default function AssistantSidebarShell() {
  const pathname = usePathname();
  const [state, dispatch] = useReducer(assistantNewSidebarReducer, "closed");
  const [isMobile, setIsMobile] = useState(false);
  const openButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef(false);
  const isOpen = state === "open";

  useEffect(() => {
    dispatch({ type: "navigate" });
  }, [pathname]);

  const closeForNavigation = useCallback(() => {
    dispatch({ type: "navigate" });
  }, []);

  const closeAndRestoreFocus = useCallback(() => {
    restoreFocusRef.current = true;
    dispatch({ type: "close" });
  }, []);

  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus();
      return;
    }

    if (restoreFocusRef.current) {
      restoreFocusRef.current = false;
      openButtonRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 639px)");
    const updateViewport = () => setIsMobile(mediaQuery.matches);

    updateViewport();
    mediaQuery.addEventListener("change", updateViewport);
    return () => mediaQuery.removeEventListener("change", updateViewport);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handlePanelKeys = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeAndRestoreFocus();
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
  }, [closeAndRestoreFocus, isMobile, isOpen]);

  return (
    <>
      {!isOpen && (
        <button
          ref={openButtonRef}
          type="button"
          aria-label="Mostrar barra lateral"
          aria-expanded={false}
          aria-controls="assistant-sidebar"
          onClick={() => dispatch({ type: "open" })}
          className="fixed left-4 top-5 z-50 flex size-11 items-center justify-center rounded-xl border border-blue-100/80 bg-white/90 text-[#385577] shadow-[0_12px_32px_rgba(44,78,118,0.16)] backdrop-blur-md transition-[transform,background-color,border-color] hover:-translate-y-0.5 hover:border-blue-200 hover:bg-white active:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563A9] motion-reduce:transition-none"
        >
          <PanelLeftOpen size={19} strokeWidth={1.8} aria-hidden="true" />
        </button>
      )}

      {isOpen && (
        <button
          type="button"
          tabIndex={-1}
          aria-label="Ocultar barra lateral"
          onClick={closeAndRestoreFocus}
          className="fixed inset-0 z-[60] hidden bg-[#112846]/20 backdrop-blur-[1px] max-sm:block"
        />
      )}

      <div
        ref={panelRef}
        id="assistant-sidebar"
        inert={!isOpen}
        aria-hidden={!isOpen}
        role={isOpen && isMobile ? "dialog" : undefined}
        aria-modal={isOpen && isMobile ? true : undefined}
        aria-label={isOpen && isMobile ? "Barra lateral principal" : undefined}
        className={isOpen ? OPEN_PANEL_CLASSES : CLOSED_PANEL_CLASSES}
      >
        <button
          ref={closeButtonRef}
          type="button"
          aria-label="Ocultar barra lateral"
          aria-expanded={true}
          aria-controls="assistant-sidebar"
          onClick={closeAndRestoreFocus}
          className="absolute -right-4 top-3 z-10 flex size-9 items-center justify-center rounded-xl border border-blue-100 bg-white text-[#385577] shadow-[0_8px_24px_rgba(44,78,118,0.16)] transition-[transform,background-color,border-color] hover:-translate-y-0.5 hover:border-blue-200 hover:bg-[#F7FAFF] active:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563A9] motion-reduce:transition-none"
        >
          <X size={17} strokeWidth={1.8} aria-hidden="true" />
        </button>
        <Sidebar variant="floating" {...{ onNavigate: closeForNavigation }} />
      </div>
    </>
  );
}
