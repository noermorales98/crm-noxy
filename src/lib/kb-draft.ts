export type KbDraft = {
  title: string;
  emoji: string;
  iconColor: string | null;
  iconBg: string | null;
  content: string;
  markdownTheme: string;
  isPublished: boolean;
  savedAt: number;
  serverUpdatedAt: string;
};

function draftKey(pageId: string) {
  return `kb_draft_${pageId}`;
}

export function loadKbDraft(pageId: string): KbDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(draftKey(pageId));
    if (!raw) return null;
    return JSON.parse(raw) as KbDraft;
  } catch {
    return null;
  }
}

export function saveKbDraft(pageId: string, draft: KbDraft) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(draftKey(pageId), JSON.stringify(draft));
  } catch {
    // ignore quota errors
  }
}

export function clearKbDraft(pageId: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(draftKey(pageId));
  } catch {
    // ignore
  }
}

export function draftDiffersFromServer(
  draft: KbDraft,
  server: {
    title: string;
    emoji: string;
    iconColor: string | null;
    iconBg: string | null;
    content: string;
    markdownTheme: string;
    isPublished: boolean;
  }
) {
  return (
    draft.title !== server.title ||
    draft.emoji !== server.emoji ||
    draft.iconColor !== server.iconColor ||
    draft.iconBg !== server.iconBg ||
    draft.content !== server.content ||
    draft.markdownTheme !== server.markdownTheme ||
    draft.isPublished !== server.isPublished
  );
}
