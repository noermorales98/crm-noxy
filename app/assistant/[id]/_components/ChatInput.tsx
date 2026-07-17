"use client";
import { useRef, useState, useEffect } from "react";
import { Square } from "lucide-react";
import ModelSelector from "./ModelSelector";
import AnimatedSendButton from "@/app/assistant/new/_components/AnimatedSendButton";
import styles from "../assistant-chat.module.css";

interface Props {
  onSend: (content: string) => void;
  onStop?: () => void;
  disabled: boolean;
  model: string;
  onModelChange: (id: string) => void;
}

export default function ChatInput({ onSend, onStop, disabled, model, onModelChange }: Props) {
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
    <div className={styles.composerOuter}>
      <div className={styles.composerInner}>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          aria-label="Mensaje para el asistente"
          placeholder="Escribe un mensaje…"
          rows={1}
          className={styles.textarea}
        />

        <div className={styles.composerToolbar}>
          <div className={styles.modelControl}>
            <ModelSelector
              value={model}
              onChange={onModelChange}
              disabled={disabled}
              placement="top-right"
            />
          </div>

          <div className={styles.composerActions}>
            {disabled ? (
              <button
                type="button"
                onClick={onStop}
                aria-label="Detener generación"
                className={styles.stopButton}
              >
                <Square size={13} fill="currentColor" aria-hidden="true" />
              </button>
            ) : (
              <div className={styles.sendControl}>
                <AnimatedSendButton disabled={!value.trim()} onClick={submit} />
              </div>
            )}
          </div>
        </div>
      </div>
      <p className={styles.disclaimer}>
        El asistente puede cometer errores. Verifica la información importante.
      </p>
    </div>
  );
}
