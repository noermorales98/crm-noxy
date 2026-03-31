"use client";

import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import { AlertTriangle, Info, ShieldAlert } from "lucide-react";

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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-4 mb-4">
              <div className={`p-3 rounded-full shrink-0 flex items-center justify-center ${options.variant === "danger" ? "bg-red-100 text-red-600" :
                  options.variant === "warning" ? "bg-amber-100 text-amber-600" :
                    "bg-blue-100 text-blue-600"
                }`}>
                {options.variant === "danger" && <ShieldAlert size={24} />}
                {options.variant === "warning" && <AlertTriangle size={24} />}
                {(!options.variant || options.variant === "info") && <Info size={24} />}
              </div>
              <div className="mt-1">
                <h3 className="text-xl font-bold text-gray-900 leading-tight">
                  {options.title}
                </h3>
                <p className="text-[15px] text-gray-500 mt-2 leading-relaxed">
                  {options.description}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-100">
              <button
                onClick={handleCancel}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                {options.cancelText || "Cancelar"}
              </button>
              <button
                onClick={handleConfirm}
                className={`px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors ${options.variant === "danger" ? "bg-red-600 hover:bg-red-700 shadow-sm shadow-red-200" :
                    options.variant === "warning" ? "bg-amber-600 hover:bg-amber-700 shadow-sm shadow-amber-200" :
                      "bg-gray-900 hover:bg-gray-800 shadow-sm"
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
