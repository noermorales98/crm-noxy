import { useCallback, useRef, useState } from "react";

export type DocSnapshot = {
  content: string;
  title: string;
  selStart?: number;
  selEnd?: number;
};

type Options = {
  limit?: number;
  debounceMs?: number;
  getSelection?: () => { start: number; end: number };
};

export function useDocUndoRedo(
  initialContent: string,
  initialTitle: string,
  options: Options = {}
) {
  const { limit = 100, debounceMs = 400, getSelection } = options;

  const [content, setContentState] = useState(initialContent);
  const [title, setTitleState] = useState(initialTitle);

  const pastRef = useRef<DocSnapshot[]>([]);
  const futureRef = useRef<DocSnapshot[]>([]);
  const currentRef = useRef<DocSnapshot>({
    content: initialContent,
    title: initialTitle,
  });
  const isNavigatingHistory = useRef(false);
  const typingSessionRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const captureSnapshot = useCallback((): DocSnapshot => {
    const sel = getSelection?.();
    return {
      content: currentRef.current.content,
      title: currentRef.current.title,
      selStart: sel?.start,
      selEnd: sel?.end,
    };
  }, [getSelection]);

  const applySnapshot = useCallback((snap: DocSnapshot): DocSnapshot => {
    isNavigatingHistory.current = true;
    currentRef.current = snap;
    setContentState(snap.content);
    setTitleState(snap.title);
    queueMicrotask(() => {
      isNavigatingHistory.current = false;
    });
    return snap;
  }, []);

  const pushPast = useCallback(
    (snap: DocSnapshot) => {
      pastRef.current.push(snap);
      if (pastRef.current.length > limit) pastRef.current.shift();
      futureRef.current = [];
    },
    [limit]
  );

  const endTypingSession = useCallback(() => {
    typingSessionRef.current = false;
    debounceRef.current = null;
  }, []);

  const scheduleEndTypingSession = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(endTypingSession, debounceMs);
  }, [debounceMs, endTypingSession]);

  const updateDoc = useCallback(
    (
      patch: Partial<Pick<DocSnapshot, "content" | "title">>,
      immediate = false
    ) => {
      if (isNavigatingHistory.current) {
        currentRef.current = { ...currentRef.current, ...patch };
        if (patch.content !== undefined) setContentState(patch.content);
        if (patch.title !== undefined) setTitleState(patch.title);
        return;
      }

      const commitCheckpoint = () => {
        pushPast(captureSnapshot());
      };

      if (immediate) {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        typingSessionRef.current = false;
        commitCheckpoint();
      } else if (!typingSessionRef.current) {
        commitCheckpoint();
        typingSessionRef.current = true;
        scheduleEndTypingSession();
      } else {
        scheduleEndTypingSession();
      }

      currentRef.current = { ...currentRef.current, ...patch };
      if (patch.content !== undefined) setContentState(patch.content);
      if (patch.title !== undefined) setTitleState(patch.title);
    },
    [captureSnapshot, pushPast, scheduleEndTypingSession]
  );

  const setContent = useCallback(
    (value: string | ((prev: string) => string)) => {
      const next =
        typeof value === "function"
          ? value(currentRef.current.content)
          : value;
      if (next === currentRef.current.content) return;
      updateDoc({ content: next }, false);
    },
    [updateDoc]
  );

  const setContentImmediate = useCallback(
    (value: string | ((prev: string) => string)) => {
      const next =
        typeof value === "function"
          ? value(currentRef.current.content)
          : value;
      if (next === currentRef.current.content) return;
      updateDoc({ content: next }, true);
    },
    [updateDoc]
  );

  const setTitle = useCallback(
    (value: string | ((prev: string) => string)) => {
      const next =
        typeof value === "function" ? value(currentRef.current.title) : value;
      if (next === currentRef.current.title) return;
      updateDoc({ title: next }, false);
    },
    [updateDoc]
  );

  const setDocImmediate = useCallback(
    (patch: { content?: string; title?: string }) => {
      const nextContent =
        patch.content !== undefined ? patch.content : currentRef.current.content;
      const nextTitle =
        patch.title !== undefined ? patch.title : currentRef.current.title;
      if (
        nextContent === currentRef.current.content &&
        nextTitle === currentRef.current.title
      ) {
        return;
      }
      updateDoc({ content: nextContent, title: nextTitle }, true);
    },
    [updateDoc]
  );

  const undo = useCallback((): DocSnapshot | null => {
    if (pastRef.current.length === 0) return null;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    typingSessionRef.current = false;

    futureRef.current.push(captureSnapshot());
    const prev = pastRef.current.pop()!;
    return applySnapshot(prev);
  }, [applySnapshot, captureSnapshot]);

  const redo = useCallback((): DocSnapshot | null => {
    if (futureRef.current.length === 0) return null;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    typingSessionRef.current = false;

    pastRef.current.push(captureSnapshot());
    const next = futureRef.current.pop()!;
    return applySnapshot(next);
  }, [applySnapshot, captureSnapshot]);

  const reset = useCallback((snap: { content: string; title: string }) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    typingSessionRef.current = false;
    pastRef.current = [];
    futureRef.current = [];
    currentRef.current = { content: snap.content, title: snap.title };
    setContentState(snap.content);
    setTitleState(snap.title);
  }, []);

  return {
    content,
    title,
    setContent,
    setContentImmediate,
    setTitle,
    setDocImmediate,
    undo,
    redo,
    reset,
  };
}
