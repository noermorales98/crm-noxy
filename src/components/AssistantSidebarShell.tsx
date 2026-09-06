"use client";

import { useCallback, useEffect, useReducer, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Pin, PinOff, X } from "lucide-react";
import Sidebar from "@/src/components/Sidebar";
import {
  INITIAL_ASSISTANT_SIDEBAR_STATE,
  assistantNewSidebarReducer,
  getSidebarFocusTarget,
  isAssistantSidebarVisible,
  readAssistantSidebarStoredMode,
  writeAssistantSidebarStoredMode,
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

const PANEL_BASE_CLASSES =
  "absolute bottom-3 left-3 top-3 w-64 max-w-[calc(100vw-24px)] transition-[transform,opacity] duration-200 motion-reduce:transition-none";
const OPEN_PANEL_CLASSES = `${PANEL_BASE_CLASSES} translate-x-0 opacity-100`;
const CLOSED_PANEL_CLASSES = `${PANEL_BASE_CLASSES} -translate-x-[calc(100%+32px)] opacity-0 pointer-events-none`;

const MOBILE_PANEL_BASE_CLASSES =
  "fixed left-3 top-[max(0.75rem,env(safe-area-inset-top))] z-[70] w-64 max-w-[calc(100vw-24px)] bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] transition-[transform,opacity] duration-200 motion-reduce:transition-none";
const MOBILE_OPEN_PANEL_CLASSES = `${MOBILE_PANEL_BASE_CLASSES} translate-x-0 opacity-100`;
const MOBILE_CLOSED_PANEL_CLASSES = `${MOBILE_PANEL_BASE_CLASSES} -translate-x-[calc(100%+32px)] opacity-0 pointer-events-none`;

const GLASS_CONTROL_CLASSES =
  "crm-glass-clear text-action-primary transition-colors duration-200 hover:bg-white/60 motion-reduce:transition-none";

const HOVER_HOST_OPEN_WIDTH = "w-[17.5rem]";

export default function AssistantSidebarShell() {
  const [state, dispatch] = useReducer(assistantNewSidebarReducer, INITIAL_ASSISTANT_SIDEBAR_STATE);
  const [isMobile, setIsMobile] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);
  const openButtonRef = useRef<HTMLButtonElement>(null);
  const hideButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const hoverHostRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef(false);
  const openedByMobileButtonRef = useRef(false);
  const mobileChrome = useOptionalMobileChrome();
  const isVisible = isAssistantSidebarVisible(state);
  const isPinned = state.mode === "pinned";

  useEffect(() => {
    const storedMode = readAssistantSidebarStoredMode();
    if (storedMode === "pinned") dispatch({ type: "pin" });
    setHasHydrated(true);
  }, []);

  useEffect(() => {
    if (!hasHydrated) return;
    writeAssistantSidebarStoredMode(state.mode);
  }, [hasHydrated, state.mode]);

  const hideSidebar = useCallback(() => {
    restoreFocusRef.current = true;
    dispatch({ type: "unpin" });
  }, []);

  const closeForNavigation = useCallback(() => {
    restoreFocusRef.current = true;
    dispatch({ type: "unpin" });
  }, []);

  const openFromMobileButton = useCallback(() => {
    openedByMobileButtonRef.current = true;
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

    if (!isVisible && restoreFocusRef.current) {
      restoreFocusRef.current = false;
      openButtonRef.current?.focus();
    }
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

  const handleHoverHostLeave = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (isPinned) return;
      const next = event.relatedTarget;
      if (next instanceof Node && hoverHostRef.current?.contains(next)) return;
      dispatch({ type: "peekClose" });
    },
    [isPinned],
  );

  const peekControls = (
    <div className="absolute -right-4 top-3 z-10 flex flex-col gap-1.5">
      <button
        type="button"
        aria-label="Fijar barra lateral"
        aria-pressed={false}
        onClick={() => dispatch({ type: "pin" })}
        className={`flex size-11 items-center justify-center rounded-control ${GLASS_CONTROL_CLASSES}`}
      >
        <Pin size={16} strokeWidth={1.8} aria-hidden="true" />
      </button>
      <button
        ref={hideButtonRef}
        type="button"
        aria-label="Ocultar barra lateral"
        aria-expanded={isVisible}
        aria-controls="assistant-sidebar"
        onClick={hideSidebar}
        className={`flex size-11 items-center justify-center rounded-control ${GLASS_CONTROL_CLASSES}`}
      >
        <X size={17} strokeWidth={1.8} aria-hidden="true" />
      </button>
    </div>
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
          {peekControls}
          <Sidebar variant="floating" onNavigate={closeForNavigation} />
        </div>
      </>
    );
  }

  if (isPinned) {
    return (
      <div
        ref={panelRef}
        id="assistant-sidebar"
        data-assistant-sidebar-pinned
        className="relative z-20 flex h-full w-64 shrink-0 flex-col transition-[width,opacity] duration-200 motion-reduce:transition-none"
      >
        <button
          ref={hideButtonRef}
          type="button"
          aria-label="Ocultar barra lateral"
          aria-expanded={true}
          aria-controls="assistant-sidebar"
          aria-pressed={true}
          onClick={hideSidebar}
          className={`absolute right-2 top-3 z-10 flex size-11 items-center justify-center rounded-control ${GLASS_CONTROL_CLASSES}`}
        >
          <PinOff size={16} strokeWidth={1.8} aria-hidden="true" />
        </button>
        <Sidebar variant="pinned" onNavigate={closeForNavigation} />
      </div>
    );
  }

  return (
    <>
      {!isVisible && (
        <button
          type="button"
          data-assistant-sidebar-pin-hint
          aria-label="Fijar barra lateral"
          title="Fijar barra lateral"
          onClick={() => dispatch({ type: "pin" })}
          className={`fixed left-4 top-5 z-[75] flex size-11 items-center justify-center rounded-control ${GLASS_CONTROL_CLASSES}`}
        >
          <Pin size={18} strokeWidth={1.8} aria-hidden="true" />
        </button>
      )}

      <div
        ref={hoverHostRef}
        data-assistant-sidebar-edge
        className={`pointer-events-auto fixed inset-y-0 left-0 z-[70] ${isVisible ? HOVER_HOST_OPEN_WIDTH : "w-3"}`}
        onPointerEnter={() => dispatch({ type: "peekOpen" })}
        onPointerLeave={handleHoverHostLeave}
      >
        <div
          ref={panelRef}
          id="assistant-sidebar"
          inert={!isVisible}
          aria-hidden={!isVisible}
          className={isVisible ? OPEN_PANEL_CLASSES : CLOSED_PANEL_CLASSES}
        >
          {peekControls}
          <Sidebar variant="floating" onNavigate={closeForNavigation} />
        </div>
      </div>
    </>
  );
}
