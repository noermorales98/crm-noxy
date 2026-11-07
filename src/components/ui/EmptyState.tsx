import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  /** Cómo se llena esta vista. */
  body?: string;
  action?: ReactNode;
};

export function EmptyState({ title, body, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-1.5 px-6 py-10 text-center">
      <p className="text-sm font-semibold text-text-primary">{title}</p>
      {body && <p className="max-w-[48ch] text-sm text-text-secondary">{body}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
