"use client";

import { createContext, useContext, useState, useCallback, useRef, ReactNode } from "react";
import { CheckCircle2, XCircle, AlertTriangle, Info, X, Trash2 } from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ConfirmState {
  message: string;
  title?: string;
  confirmLabel?: string;
  isDanger?: boolean;
  resolve: (value: boolean) => void;
}

interface ToastContextValue {
  addToast: (message: string, type?: ToastType) => void;
  showConfirm: (message: string, options?: { title?: string; confirmLabel?: string; isDanger?: boolean }) => Promise<boolean>;
}

// ── Context ──────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);

  const addToast = useCallback((message: string, type: ToastType = "info") => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showConfirm = useCallback(
    (message: string, options?: { title?: string; confirmLabel?: string; isDanger?: boolean }): Promise<boolean> => {
      return new Promise(resolve => {
        setConfirm({ message, resolve, ...options });
      });
    },
    []
  );

  const handleConfirmResolve = (value: boolean) => {
    confirm?.resolve(value);
    setConfirm(null);
  };

  return (
    <ToastContext.Provider value={{ addToast, showConfirm }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      {confirm && (
        <ConfirmDialog
          message={confirm.message}
          title={confirm.title}
          confirmLabel={confirm.confirmLabel}
          isDanger={confirm.isDanger}
          onConfirm={() => handleConfirmResolve(true)}
          onCancel={() => handleConfirmResolve(false)}
        />
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}

// ── Toast Container ───────────────────────────────────────────────────────────

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 size={18} className="shrink-0 text-green-500" />,
  error: <XCircle size={18} className="shrink-0 text-red-500" />,
  warning: <AlertTriangle size={18} className="shrink-0 text-amber-500" />,
  info: <Info size={18} className="shrink-0 text-blue-500" />,
};

const BORDERS: Record<ToastType, string> = {
  success: "border-green-100",
  error: "border-red-100",
  warning: "border-amber-100",
  info: "border-blue-100",
};

function ToastContainer({
  toasts,
  onRemove,
}: {
  toasts: ToastItem[];
  onRemove: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`flex items-start gap-3 bg-white border ${BORDERS[toast.type]} rounded-xl shadow-lg px-4 py-3 pointer-events-auto`}
        >
          {ICONS[toast.type]}
          <p className="flex-1 text-sm text-gray-800 leading-snug">{toast.message}</p>
          <button
            onClick={() => onRemove(toast.id)}
            className="text-gray-400 hover:text-gray-600 transition-colors shrink-0 mt-0.5"
          >
            <X size={15} />
          </button>
        </div>
      ))}
    </div>
  );
}

// ── Confirm Dialog ────────────────────────────────────────────────────────────

function ConfirmDialog({
  message,
  title,
  confirmLabel,
  isDanger,
  onConfirm,
  onCancel,
}: {
  message: string;
  title?: string;
  confirmLabel?: string;
  isDanger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 flex flex-col gap-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          {isDanger ? (
            <div className="p-2 bg-red-50 rounded-xl shrink-0">
              <Trash2 size={18} className="text-red-500" />
            </div>
          ) : (
            <div className="p-2 bg-amber-50 rounded-xl shrink-0">
              <AlertTriangle size={18} className="text-amber-500" />
            </div>
          )}
          <div className="flex flex-col gap-1">
            {title && <p className="text-sm font-bold text-gray-900">{title}</p>}
            <p className="text-sm text-gray-600 leading-relaxed">{message}</p>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium rounded-xl transition-colors ${isDanger
                ? "bg-red-600 hover:bg-red-700 text-white"
                : "bg-gray-900 hover:bg-gray-800 text-white"
              }`}
          >
            {confirmLabel ?? "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}
