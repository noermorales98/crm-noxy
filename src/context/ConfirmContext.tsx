"use client";

import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert01Icon, InformationCircleIcon, ShieldUserIcon } from "@hugeicons/core-free-icons";

type ConfirmOptions = {
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
};

type ConfirmContextType = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);

  const resolver = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    setOptions(opts);
    setIsOpen(true);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const handleConfirm = () => {
    setIsOpen(false);
    if (resolver.current) resolver.current(true);
  };

  const handleCancel = () => {
    setIsOpen(false);
    if (resolver.current) resolver.current(false);
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {isOpen && options && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 p-4">
          <div className="bg-surface-elevated rounded-lg w-full max-w-md overflow-hidden flex flex-col p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className={`p-3 rounded-lg shrink-0 flex items-center justify-center ${options.variant === "danger" ? "bg-red-100 text-red-600" :
                  options.variant === "warning" ? "bg-amber-100 text-amber-600" :
                    "bg-blue-100 text-blue-600"
                }`}>
                {options.variant === "danger" && <HugeiconsIcon icon={ShieldUserIcon} size={24} />}
                {options.variant === "warning" && <HugeiconsIcon icon={Alert01Icon} size={24} />}
                {(!options.variant || options.variant === "info") && <HugeiconsIcon icon={InformationCircleIcon} size={24} />}
              </div>
              <div className="mt-1">
                <h3 className="text-xl font-bold text-text-primary leading-tight">
                  {options.title}
                </h3>
                <p className="text-[15px] text-text-secondary mt-2 leading-relaxed">
                  {options.description}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-border-subtle">
              <button
                onClick={handleCancel}
                className="px-5 py-2.5 rounded-lg text-sm font-semibold text-text-primary bg-nav-active hover:bg-nav-hover transition-colors"
              >
                {options.cancelText || "Cancelar"}
              </button>
              <button
                onClick={handleConfirm}
                className={`px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors ${options.variant === "danger" ? "bg-red-600 hover:bg-red-700" :
                    options.variant === "warning" ? "bg-amber-600 hover:bg-amber-700" :
                      "bg-action-primary hover:opacity-90"
                  }`}
              >
                {options.confirmText || "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error("useConfirm must be used within a ConfirmProvider");
  }
  return context;
}
