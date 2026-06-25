"use client";
import { useRef, useState, useEffect } from "react";
import { Send } from "lucide-react";

interface Props {
  onSend: (content: string) => void;
  disabled: boolean;
}

export default function ChatInput({ onSend, disabled }: Props) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
    <div className="border-t border-border-subtle bg-surface-elevated px-4 py-3">
      <div className="max-w-[720px] mx-auto flex items-end gap-3 bg-white border border-border-subtle rounded-xl px-4 py-3 shadow-sm">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="Escribe un mensaje… (Enter para enviar, Shift+Enter para nueva línea)"
          rows={1}
          className="flex-1 resize-none bg-transparent text-sm text-text-primary placeholder:text-text-secondary focus:outline-none leading-relaxed disabled:opacity-50"
          style={{ maxHeight: "144px", overflowY: "auto" }}
        />
        <button
          onClick={submit}
          disabled={disabled || !value.trim()}
          className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-[#2D2D2D] text-white hover:bg-black transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {disabled ? (
            <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Send size={14} />
          )}
        </button>
      </div>
      <p className="text-[10px] text-text-secondary text-center mt-2">
        El asistente puede cometer errores. Verifica la información importante.
      </p>
    </div>
  );
}
