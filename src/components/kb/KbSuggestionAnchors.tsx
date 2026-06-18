"use client";

import { useCallback, useEffect, useLayoutEffect } from "react";
import {
  applySuggestionHighlights,
  scrollAnchorIntoView,
  type AnchorSuggestion,
} from "@/src/lib/kb-suggestion-anchors";

type KbSuggestionAnchorsProps = {
  suggestions: AnchorSuggestion[];
  activeSuggestionId: string | null;
  onSelect: (suggestionId: string) => void;
  proseContainerRef: React.RefObject<HTMLElement | null>;
  markdownContent?: string;
  onAnchorsChange?: (result: { anchoredIds: Set<string>; missingIds: Set<string> }) => void;
};

export default function KbSuggestionAnchors({
  suggestions,
  activeSuggestionId,
  onSelect,
  proseContainerRef,
  markdownContent,
  onAnchorsChange,
}: KbSuggestionAnchorsProps) {
  const getProseEl = useCallback((): HTMLElement | null => {
    const container = proseContainerRef.current;
    if (!container) return null;
    return container.querySelector(".kb-prose") as HTMLElement | null;
  }, [proseContainerRef]);

  useLayoutEffect(() => {
    const proseEl = getProseEl();
    if (!proseEl) return;

    const result = applySuggestionHighlights(proseEl, suggestions, onSelect, markdownContent);
    onAnchorsChange?.(result);
  }, [suggestions, onSelect, getProseEl, onAnchorsChange, markdownContent]);

  useLayoutEffect(() => {
    const proseEl = getProseEl();
    if (!proseEl) return;

    proseEl.querySelectorAll("mark.kb-suggestion-anchor").forEach((el) => {
      const id = el.getAttribute("data-suggestion-id");
      el.classList.toggle("is-active", activeSuggestionId != null && id === activeSuggestionId);
    });
  }, [activeSuggestionId, suggestions, getProseEl]);

  useEffect(() => {
    if (!activeSuggestionId) return;
    const proseEl = getProseEl();
    scrollAnchorIntoView(activeSuggestionId, proseEl ?? undefined);
  }, [activeSuggestionId, getProseEl]);

  return null;
}
