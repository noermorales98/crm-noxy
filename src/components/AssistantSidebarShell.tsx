"use client";

import { useCallback, useEffect, useReducer, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { PanelLeftOpen, Pin, PinOff, X } from "lucide-react";
import Sidebar from "@/src/components/Sidebar";
import {
  INITIAL_ASSISTANT_SIDEBAR_STATE,
  assistantNewSidebarReducer,
  getSidebarFocusTarget,
  isAssistantSidebarVisible,
  readAssistantSidebarStoredMode,
  writeAssistantSidebarStoredMode,
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
  "absolute bottom-3 left-3 top-3 w-64 max-w-[calc(100vw-24px)] transition-[transform,opacity] duration-200 motion-reduce:transition-none";
const OPEN_PANEL_CLASSES = `${PANEL_BASE_CLASSES} translate-x-0 opacity-100`;
const CLOSED_PANEL_CLASSES = `${PANEL_BASE_CLASSES} -translate-x-[calc(100%+32px)] opacity-0 pointer-events-none`;

const MOBILE_PANEL_BASE_CLASSES =
  "fixed bottom-3 left-3 top-3 z-[70] w-64 max-w-[calc(100vw-24px)] transition-[transform,opacity] duration-200 motion-reduce:transition-none";
const MOBILE_OPEN_PANEL_CLASSES = `${MOBILE_PANEL_BASE_CLASSES} translate-x-0 opacity-100`;
const MOBILE_CLOSED_PANEL_CLASSES = `${MOBILE_PANEL_BASE_CLASSES} -translate-x-[calc(100%+32px)] opacity-0 pointer-events-none`;

const GLASS_CONTROL_CLASSES =
  "border border-black/[0.06] bg-white/45 text-action-primary shadow-none backdrop-blur-[28px] backdrop-saturate-[1.3] transition-colors duration-200 hover:bg-white/60 motion-reduce:transition-none";

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

  const panelControls = (
    <div className="absolute -right-4 top-3 z-10 flex flex-col gap-1.5">
      {!isPinned && (
        <button
          type="button"
          aria-label="Fijar barra lateral"
          aria-pressed={false}
          onClick={() => dispatch({ type: "pin" })}
          className={`flex size-9 items-center justify-center rounded-control ${GLASS_CONTROL_CLASSES}`}
        >
          <Pin size={16} strokeWidth={1.8} aria-hidden="true" />
        </button>
      )}
      <button
        ref={hideButtonRef}
        type="button"
        aria-label="Ocultar barra lateral"
        aria-expanded={isVisible}
        aria-controls="assistant-sidebar"
        onClick={hideSidebar}
        className={`flex size-9 items-center justify-center rounded-control ${GLASS_CONTROL_CLASSES}`}
      >
        {isPinned ? (
          <PinOff size={16} strokeWidth={1.8} aria-hidden="true" />
        ) : (
          <X size={17} strokeWidth={1.8} aria-hidden="true" />
        )}
      </button>
    </div>
  );

  if (isMobile) {
    return (
      <>
        {!isVisible && (
          <button
            ref={openButtonRef}
            type="button"
            aria-label="Mostrar barra lateral"
            aria-expanded={false}
            aria-controls="assistant-sidebar"
            onClick={openFromMobileButton}
            className={`fixed left-4 top-5 z-50 flex size-11 items-center justify-center rounded-control ${GLASS_CONTROL_CLASSES}`}
          >
            <PanelLeftOpen size={19} strokeWidth={1.8} aria-hidden="true" />
          </button>
        )}

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
          {panelControls}
          <Sidebar variant="floating" onNavigate={closeForNavigation} />
        </div>
      </>
    );
  }

  return (
    <div
      ref={hoverHostRef}
      data-assistant-sidebar-edge
      className={`fixed inset-y-0 left-0 z-[70] ${isVisible || isPinned ? HOVER_HOST_OPEN_WIDTH : "w-3"}`}
      onPointerEnter={() => {
        if (!isPinned) dispatch({ type: "peekOpen" });
      }}
      onPointerLeave={handleHoverHostLeave}
    >
      <div
        ref={panelRef}
        id="assistant-sidebar"
        inert={!isVisible}
        aria-hidden={!isVisible}
        className={isVisible ? OPEN_PANEL_CLASSES : CLOSED_PANEL_CLASSES}
      >
        {panelControls}
        <Sidebar variant="floating" onNavigate={closeForNavigation} />
      </div>
    </div>
  );
}
