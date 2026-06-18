export type AnchorSuggestion = {
  id: string;
  selectedText: string | null;
  startOffset: number | null;
};

type TextSegment = {
  node: Text;
  start: number;
  end: number;
};

type TextSlice = {
  node: Text;
  start: number;
  end: number;
};

type NormalizedIndex = {
  normalized: string;
  /** Maps normalized index -> original fullText index */
  map: number[];
};

function normalizeTextForMatch(text: string): string {
  return text
    .normalize("NFKC")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Strip common inline markdown markers from a selection string */
function stripInlineMarkdown(text: string): string {
  return text
    .replace(/^[*_`~]+/, "")
    .replace(/[*_`~]+$/, "")
    .replace(/^\*\*([\s\S]+)\*\*$/, "$1")
    .replace(/^__([\s\S]+)__$/, "$1")
    .replace(/^\*([\s\S]+)\*$/, "$1")
    .replace(/^_([\s\S]+)_$/, "$1")
    .trim();
}

function removeInlineMarkdownFromLine(line: string): string {
  let s = line;
  s = s.replace(/`([^`]+)`/g, "$1");
  s = s.replace(/\*\*([^*]+)\*\*/g, "$1");
  s = s.replace(/__([^_]+)__/g, "$1");
  s = s.replace(/(?<![*_])\*([^*]+)\*(?![*_])/g, "$1");
  s = s.replace(/(?<![*_])_([^_]+)_(?![*_])/g, "$1");
  return s;
}

/** Approximate plain-text character index from a markdown source offset */
export function markdownToPlainTextHint(content: string, mdOffset: number): number {
  if (mdOffset <= 0) return 0;

  const prefix = content.slice(0, mdOffset);
  const lines = prefix.split("\n");
  const plainLines: string[] = [];

  for (const rawLine of lines) {
    let line = rawLine;
    line = line.replace(/^>\s?/, "");
    line = line.replace(/^#{1,6}\s+/, "");
    line = line.replace(/^[-*+]\s+/, "");
    line = line.replace(/^\d+\.\s+/, "");
    line = removeInlineMarkdownFromLine(line);
    plainLines.push(line);
  }

  return normalizeTextForMatch(plainLines.join("\n")).length;
}

function buildNormalizedIndex(fullText: string): NormalizedIndex {
  const map: number[] = [];
  let normalized = "";
  let lastWasSpace = false;

  for (let i = 0; i < fullText.length; i++) {
    const ch = fullText[i];
    if (/\s/.test(ch)) {
      if (!lastWasSpace && normalized.length > 0) {
        normalized += " ";
        map.push(i);
        lastWasSpace = true;
      }
    } else {
      normalized += ch;
      map.push(i);
      lastWasSpace = false;
    }
  }

  while (normalized.startsWith(" ")) {
    normalized = normalized.slice(1);
    map.shift();
  }
  while (normalized.endsWith(" ")) {
    normalized = normalized.slice(0, -1);
    map.pop();
  }

  return { normalized, map };
}

function collectTextSegments(root: HTMLElement): { segments: TextSegment[]; fullText: string } {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const segments: TextSegment[] = [];
  let pos = 0;
  let node = walker.nextNode() as Text | null;

  while (node) {
    const len = node.textContent?.length ?? 0;
    segments.push({ node, start: pos, end: pos + len });
    pos += len;
    node = walker.nextNode() as Text | null;
  }

  return { segments, fullText: root.textContent ?? "" };
}

function rangeFromPlainOffsets(
  segments: TextSegment[],
  matchStart: number,
  matchLength: number
): Range | null {
  const matchEnd = matchStart + matchLength;
  let startNode: Text | null = null;
  let startOffsetInNode = 0;
  let endNode: Text | null = null;
  let endOffsetInNode = 0;

  for (const { node, start, end } of segments) {
    if (!startNode && matchStart >= start && matchStart < end) {
      startNode = node;
      startOffsetInNode = matchStart - start;
    }
    if (matchEnd > start && matchEnd <= end) {
      endNode = node;
      endOffsetInNode = matchEnd - start;
      break;
    }
  }

  if (!startNode || !endNode) return null;

  const range = document.createRange();
  range.setStart(startNode, startOffsetInNode);
  range.setEnd(endNode, endOffsetInNode);
  return range;
}

function findOccurrences(haystack: string, needle: string): number[] {
  const occurrences: number[] = [];
  if (!needle) return occurrences;

  let idx = 0;
  while (idx <= haystack.length) {
    const found = haystack.indexOf(needle, idx);
    if (found === -1) break;
    occurrences.push(found);
    idx = found + 1;
  }
  return occurrences;
}

function pickClosestOccurrence(occurrences: number[], hint: number): number {
  return occurrences.reduce((best, occ) =>
    Math.abs(occ - hint) < Math.abs(best - hint) ? occ : best
  );
}

function findMatchInFullText(
  fullText: string,
  selectedText: string,
  hint?: number | null
): { start: number; length: number } | null {
  const candidates = [
    selectedText,
    normalizeTextForMatch(selectedText),
    stripInlineMarkdown(selectedText),
    normalizeTextForMatch(stripInlineMarkdown(selectedText)),
  ].filter((c, i, arr) => c && arr.indexOf(c) === i);

  for (const candidate of candidates) {
    const occurrences = findOccurrences(fullText, candidate);
    if (occurrences.length === 0) continue;

    const start =
      hint != null && hint >= 0
        ? pickClosestOccurrence(occurrences, hint)
        : occurrences[0];
    return { start, length: candidate.length };
  }

  const { normalized, map } = buildNormalizedIndex(fullText);
  for (const candidate of candidates) {
    const normCandidate = normalizeTextForMatch(candidate);
    const normOccurrences = findOccurrences(normalized, normCandidate);
    if (normOccurrences.length === 0) continue;

    const normStart =
      hint != null && hint >= 0
        ? pickClosestOccurrence(normOccurrences, hint)
        : normOccurrences[0];
    const origStart = map[normStart];
    const origEnd = map[normStart + normCandidate.length - 1];
    if (origStart == null || origEnd == null) continue;

    return { start: origStart, length: origEnd - origStart + 1 };
  }

  return null;
}

export function findTextRangeInProse(
  proseEl: HTMLElement,
  selectedText: string,
  startOffset?: number | null,
  markdownContent?: string
): Range | null {
  const text = selectedText.trim();
  if (!text) return null;

  const { segments, fullText } = collectTextSegments(proseEl);
  if (!fullText) return null;

  let hint: number | null = null;
  if (startOffset != null && startOffset >= 0) {
    hint =
      markdownContent != null
        ? markdownToPlainTextHint(markdownContent, startOffset)
        : startOffset;
  }

  const match = findMatchInFullText(fullText, text, hint);
  if (!match) return null;

  return rangeFromPlainOffsets(segments, match.start, match.length);
}

function getWalkerRoot(range: Range): Node {
  const ca = range.commonAncestorContainer;
  if (ca.nodeType === Node.TEXT_NODE) return ca.parentNode!;
  return ca;
}

function getTextSlicesInRange(range: Range): TextSlice[] {
  const slices: TextSlice[] = [];
  const root = getWalkerRoot(range);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      return range.intersectsNode(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });

  let textNode = walker.nextNode() as Text | null;
  while (textNode) {
    let start = 0;
    let end = textNode.length;
    if (range.startContainer === textNode) start = range.startOffset;
    if (range.endContainer === textNode) end = range.endOffset;
    if (start < end) slices.push({ node: textNode, start, end });
    textNode = walker.nextNode() as Text | null;
  }

  return slices;
}

function wrapTextSlice(node: Text, start: number, end: number, suggestionId: string): HTMLElement | null {
  const subRange = document.createRange();
  subRange.setStart(node, start);
  subRange.setEnd(node, end);
  const mark = document.createElement("mark");
  mark.className = "kb-suggestion-anchor";
  mark.setAttribute("data-suggestion-id", suggestionId);
  try {
    subRange.surroundContents(mark);
    return mark;
  } catch {
    return null;
  }
}

export function clearHighlights(proseEl: HTMLElement): void {
  proseEl.querySelectorAll("mark[data-suggestion-id]").forEach((mark) => {
    const parent = mark.parentNode;
    if (!parent) return;
    while (mark.firstChild) {
      parent.insertBefore(mark.firstChild, mark);
    }
    parent.removeChild(mark);
  });
  proseEl.normalize();
}

export function wrapRangeWithHighlight(range: Range, suggestionId: string): HTMLElement | null {
  try {
    const mark = document.createElement("mark");
    mark.className = "kb-suggestion-anchor";
    mark.setAttribute("data-suggestion-id", suggestionId);
    range.surroundContents(mark);
    return mark;
  } catch {
    const slices = getTextSlicesInRange(range);
    if (slices.length === 0) return null;

    let firstMark: HTMLElement | null = null;
    for (let i = slices.length - 1; i >= 0; i--) {
      const mark = wrapTextSlice(slices[i].node, slices[i].start, slices[i].end, suggestionId);
      if (mark && !firstMark) firstMark = mark;
    }
    return firstMark;
  }
}

export function getAnchorElements(suggestionId: string, root?: ParentNode): HTMLElement[] {
  const scope = root ?? document;
  return Array.from(
    scope.querySelectorAll(`mark[data-suggestion-id="${CSS.escape(suggestionId)}"]`)
  ) as HTMLElement[];
}

export function getAnchorElement(suggestionId: string, root?: ParentNode): HTMLElement | null {
  return getAnchorElements(suggestionId, root)[0] ?? null;
}

export function getAnchorBoundingRect(suggestionId: string, root?: ParentNode): DOMRect | null {
  const marks = getAnchorElements(suggestionId, root);
  if (marks.length === 0) return null;

  let top = Infinity;
  let left = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;

  for (const el of marks) {
    const r = el.getBoundingClientRect();
    top = Math.min(top, r.top);
    left = Math.min(left, r.left);
    right = Math.max(right, r.right);
    bottom = Math.max(bottom, r.bottom);
  }

  return new DOMRect(left, top, right - left, bottom - top);
}

export function getAnchorRect(suggestionId: string, root?: ParentNode): DOMRect | null {
  return getAnchorBoundingRect(suggestionId, root);
}

export type ApplyHighlightsResult = {
  anchoredIds: Set<string>;
  missingIds: Set<string>;
};

export function applySuggestionHighlights(
  proseEl: HTMLElement,
  suggestions: AnchorSuggestion[],
  onMarkClick?: (suggestionId: string) => void,
  markdownContent?: string
): ApplyHighlightsResult {
  clearHighlights(proseEl);

  const anchoredIds = new Set<string>();
  const missingIds = new Set<string>();

  const withText = suggestions.filter((s) => s.selectedText?.trim());
  const sorted = [...withText].sort((a, b) => (b.startOffset ?? 0) - (a.startOffset ?? 0));

  for (const suggestion of sorted) {
    const range = findTextRangeInProse(
      proseEl,
      suggestion.selectedText!,
      suggestion.startOffset,
      markdownContent
    );
    if (!range) {
      missingIds.add(suggestion.id);
      continue;
    }

    const mark = wrapRangeWithHighlight(range, suggestion.id);
    if (!mark) {
      missingIds.add(suggestion.id);
      continue;
    }

    if (onMarkClick) {
      const handler = (e: Event) => {
        e.stopPropagation();
        onMarkClick(suggestion.id);
      };
      getAnchorElements(suggestion.id, proseEl).forEach((el) => {
        el.addEventListener("click", handler);
      });
    }
    anchoredIds.add(suggestion.id);
  }

  return { anchoredIds, missingIds };
}

export function scrollAnchorIntoView(suggestionId: string, root?: ParentNode): void {
  const el = getAnchorElement(suggestionId, root);
  el?.scrollIntoView({ block: "center", behavior: "smooth" });
}
