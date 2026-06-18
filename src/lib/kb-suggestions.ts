import type { KbSuggestion, KbSuggestionType } from "@prisma/client";

function removeInlineMarkdownFromLine(line: string): string {
  let s = line;
  s = s.replace(/`([^`]+)`/g, "$1");
  s = s.replace(/\*\*([^*]+)\*\*/g, "$1");
  s = s.replace(/__([^_]+)__/g, "$1");
  s = s.replace(/(?<![*_])\*([^*]+)\*(?![*_])/g, "$1");
  s = s.replace(/(?<![*_])_([^_]+)_(?![*_])/g, "$1");
  return s;
}

function stripBlockMarkdownLine(line: string): string {
  let s = line;
  s = s.replace(/^>\s?/, "");
  s = s.replace(/^#{1,6}\s+/, "");
  s = s.replace(/^[-*+]\s+/, "");
  s = s.replace(/^\d+\.\s+/, "");
  return removeInlineMarkdownFromLine(s);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function findSelectionInMarkdown(
  content: string,
  selectedText: string,
  hintOffset?: number
): { startOffset: number; endOffset: number } | null {
  const trimmed = selectedText.trim();
  if (!trimmed) return null;

  const tryMatch = (haystack: string, offsetBias = 0): { startOffset: number; endOffset: number } | null => {
    if (hintOffset !== undefined && hintOffset >= 0) {
      const slice = haystack.slice(hintOffset, hintOffset + trimmed.length);
      if (slice === trimmed) {
        return { startOffset: hintOffset + offsetBias, endOffset: hintOffset + offsetBias + trimmed.length };
      }
      const nearby = haystack.indexOf(trimmed, Math.max(0, hintOffset - 80));
      if (nearby !== -1 && nearby <= hintOffset + 80) {
        return { startOffset: nearby + offsetBias, endOffset: nearby + offsetBias + trimmed.length };
      }
    }

    const idx = haystack.indexOf(trimmed);
    if (idx === -1) return null;
    return { startOffset: idx + offsetBias, endOffset: idx + offsetBias + trimmed.length };
  };

  const direct = tryMatch(content, 0);
  if (direct) return direct;

  // Search line-by-line in markdown for the plain text
  const lines = content.split("\n");
  let lineStart = 0;
  for (const line of lines) {
    const plainLine = stripBlockMarkdownLine(line);
    const lineIdx = plainLine.indexOf(trimmed);
    if (lineIdx !== -1) {
      const mdLineIdx = line.indexOf(trimmed);
      if (mdLineIdx !== -1) {
        return {
          startOffset: lineStart + mdLineIdx,
          endOffset: lineStart + mdLineIdx + trimmed.length,
        };
      }
      // Text exists only after stripping markers (e.g. `_nota_` -> `nota`)
      const markerMatch = line.match(
        new RegExp(`[_*]{1,2}${escapeRegExp(trimmed)}[_*]{1,2}`)
      );
      if (markerMatch && markerMatch.index != null) {
        return {
          startOffset: lineStart + markerMatch.index,
          endOffset: lineStart + markerMatch.index + markerMatch[0].length,
        };
      }
    }
    lineStart += line.length + 1;
  }

  return null;
}

export function validateSuggestionAnchor(
  content: string,
  suggestion: Pick<KbSuggestion, "startOffset" | "endOffset" | "selectedText" | "type">
): { ok: true } | { ok: false; reason: string } {
  if (suggestion.type === "COMMENT" || suggestion.type === "INSERT") {
    if (suggestion.startOffset === null || suggestion.startOffset === undefined) {
      return { ok: false, reason: "Ancla inválida" };
    }
    return { ok: true };
  }

  if (suggestion.startOffset === null || suggestion.endOffset === null) {
    return { ok: false, reason: "Ancla inválida" };
  }

  const slice = content.slice(suggestion.startOffset, suggestion.endOffset);
  if (suggestion.selectedText && slice !== suggestion.selectedText) {
    return {
      ok: false,
      reason: "El texto del documento cambió desde que se creó la sugerencia",
    };
  }

  return { ok: true };
}

export function applySuggestionToContent(
  content: string,
  suggestion: Pick<
    KbSuggestion,
    "type" | "startOffset" | "endOffset" | "selectedText" | "suggestedText"
  >
): { ok: true; content: string } | { ok: false; reason: string } {
  const validation = validateSuggestionAnchor(content, suggestion);
  if (!validation.ok) return validation;

  const start = suggestion.startOffset ?? 0;
  const end = suggestion.endOffset ?? start;

  switch (suggestion.type) {
    case "COMMENT":
      return { ok: true, content };
    case "REPLACE": {
      const replacement = suggestion.suggestedText ?? "";
      return { ok: true, content: content.slice(0, start) + replacement + content.slice(end) };
    }
    case "DELETE":
      return { ok: true, content: content.slice(0, start) + content.slice(end) };
    case "INSERT": {
      const insert = suggestion.suggestedText ?? "";
      return { ok: true, content: content.slice(0, start) + insert + content.slice(start) };
    }
    default:
      return { ok: false, reason: "Tipo de sugerencia desconocido" };
  }
}

export type CreateSuggestionInput = {
  type: KbSuggestionType;
  authorName: string;
  authorEmail?: string | null;
  selectedText?: string | null;
  suggestedText?: string | null;
  comment?: string | null;
  startOffset?: number | null;
  endOffset?: number | null;
  hintOffset?: number;
};

export function resolveSuggestionOffsets(
  content: string,
  input: CreateSuggestionInput
): { startOffset: number | null; endOffset: number | null } {
  if (input.type === "COMMENT" && !input.selectedText) {
    return {
      startOffset: input.startOffset ?? 0,
      endOffset: input.endOffset ?? input.startOffset ?? 0,
    };
  }

  if (input.startOffset !== null && input.startOffset !== undefined && input.endOffset !== null && input.endOffset !== undefined) {
    return { startOffset: input.startOffset, endOffset: input.endOffset };
  }

  if (input.selectedText) {
    const found = findSelectionInMarkdown(content, input.selectedText, input.hintOffset);
    if (found) return found;
  }

  return {
    startOffset: input.startOffset ?? null,
    endOffset: input.endOffset ?? null,
  };
}

export const GUEST_NAME_KEY = "kb-guest-name";
export const GUEST_EMAIL_KEY = "kb-guest-email";
export const COMMENTATOR_ONBOARDING_KEY = "kb-commentator-onboarding-seen";

export function getStoredGuestIdentity(): { name: string | null; email: string } {
  if (typeof window === "undefined") {
    return { name: null, email: "" };
  }
  return {
    name: sessionStorage.getItem(GUEST_NAME_KEY),
    email: sessionStorage.getItem(GUEST_EMAIL_KEY) ?? "",
  };
}

export function setStoredGuestIdentity(name: string, email: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(GUEST_NAME_KEY, name);
  sessionStorage.setItem(GUEST_EMAIL_KEY, email);
}
