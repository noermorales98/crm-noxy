"use client";
import { useRef, useState, useEffect } from "react";
import { Send, Square } from "lucide-react";
import ModelSelector from "./ModelSelector";
import { getModelById } from "@/src/lib/ai-models";

interface Props {
  onSend: (content: string) => void;
  onStop?: () => void;
  disabled: boolean;
  model: string;
  onModelChange: (id: string) => void;
  preferredKey: "1" | "2";
  onKeyChange: (k: "1" | "2") => void;
}

export default function ChatInput({ onSend, onStop, disabled, model, onModelChange, preferredKey, onKeyChange }: Props) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isOrModel = model !== "chatbase";

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 144)}px`;
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  return (
    <div className="px-4 pb-5 pt-2">
      <div className="max-w-[720px] mx-auto">
        {/* Pill container */}
        <div className="flex items-end gap-2 bg-white border border-border-subtle rounded-full px-5 py-3 shadow-[0_4px_24px_rgba(0,0,0,0.10)] focus-within:shadow-[0_4px_28px_rgba(0,0,0,0.15)] transition-shadow">
          {/* Growing textarea */}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder="Escribe un mensaje…"
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm text-text-primary placeholder:text-text-secondary focus:outline-none leading-relaxed disabled:opacity-50 py-0.5"
            style={{ maxHeight: "144px", overflowY: "auto" }}
          />

          {/* Right side controls */}
          <div className="flex items-center gap-2 shrink-0">
            <ModelSelector
              value={model}
              onChange={onModelChange}
              disabled={disabled}
              placement="top-right"
            />

            {/* Key selector — only for OpenRouter models */}
            {isOrModel && (
              <button
                type="button"
                onClick={() => onKeyChange(preferredKey === "1" ? "2" : "1")}
                disabled={disabled}
                title={`Usando key ${preferredKey}. Clic para cambiar.`}
                className={`text-[10px] font-semibold px-2 py-1 rounded-md transition-colors disabled:opacity-40 ${
                  preferredKey === "2"
                    ? "bg-[#EEF2FF] text-[#6366F1]"
                    : "text-text-secondary/60 hover:text-text-secondary hover:bg-black/5"
                }`}
              >
                K{preferredKey}
              </button>
            )}

            {disabled ? (
              <button
                type="button"
                onClick={onStop}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-accent-charcoal text-white hover:bg-red-600 transition-all"
                title="Detener"
              >
                <Square size={12} fill="currentColor" />
              </button>
            ) : (
              <button
                onClick={submit}
                disabled={!value.trim()}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-accent-charcoal text-white hover:bg-black transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Send size={13} />
              </button>
            )}
          </div>
        </div>

        <p className="text-[10px] text-text-secondary text-center mt-2">
          El asistente puede cometer errores. Verifica la información importante.
        </p>
      </div>
    </div>
  );
}
