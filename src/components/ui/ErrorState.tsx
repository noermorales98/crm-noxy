"use client";

type ErrorStateProps = {
  title: string;
  onRetry?: () => void;
};

export function ErrorState({ title, onRetry }: ErrorStateProps) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 px-6 py-10 text-center">
      <p className="text-sm font-semibold text-danger">{title}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="crm-press min-h-11 rounded-control border border-line bg-surface-elevated px-4 text-sm font-semibold text-text-primary hover:bg-surface-sidebar"
        >
          Reintentar
        </button>
      )}
    </div>
  );
}
