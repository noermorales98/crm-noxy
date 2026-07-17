export type MessageBubblePresentation = "default" | "soft-card";

export function resolveMessageBubblePresentation(
  presentation: MessageBubblePresentation | undefined,
): MessageBubblePresentation {
  return presentation ?? "default";
}

export function getDialogTabTarget<T>(
  focusableItems: readonly T[],
  activeItem: T | null,
  backwards: boolean,
): T | null {
  if (focusableItems.length === 0) return null;

  const first = focusableItems[0];
  const last = focusableItems[focusableItems.length - 1];
  if (activeItem === null) return backwards ? last : first;
  if (!backwards && activeItem === last) return first;
  if (backwards && activeItem === first) return last;
  return null;
}

type ScheduleTimer<T> = (callback: () => void, delay: number) => T;
type ClearTimer<T> = (timer: T) => void;

export function createReplaceableTimer<T = ReturnType<typeof setTimeout>>(
  scheduleTimer: ScheduleTimer<T> = setTimeout as unknown as ScheduleTimer<T>,
  clearTimer: ClearTimer<T> = clearTimeout as unknown as ClearTimer<T>,
) {
  let currentTimer: T | null = null;
  let disposed = false;

  const clear = () => {
    if (currentTimer === null) return;
    clearTimer(currentTimer);
    currentTimer = null;
  };

  return {
    schedule(callback: () => void, delay: number) {
      if (disposed) return;
      clear();
      currentTimer = scheduleTimer(() => {
        currentTimer = null;
        callback();
      }, delay);
    },
    dispose() {
      disposed = true;
      clear();
    },
  };
}
