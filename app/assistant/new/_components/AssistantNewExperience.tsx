"use client";

import { type ChangeEvent, type KeyboardEvent, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import ModelSelector from "@/app/assistant/[id]/_components/ModelSelector";
import AnimatedSendButton from "./AnimatedSendButton";
import SkillMenu from "@/src/components/ai/SkillMenu";
import CapabilityChips from "@/src/components/ai/CapabilityChips";
import { ASSISTANT_NEW_COPY, pickAssistantGreeting } from "./assistant-new-copy";
import styles from "../assistant-new.module.css";

const TYPEWRITER_PHRASES = ASSISTANT_NEW_COPY.prompts;

interface AssistantNewExperienceProps {
  /** Criatura del chat, encima del saludo. */
  mascot?: React.ReactNode;
  /** Esquina superior derecha (ajustes del asistente). */
  corner?: React.ReactNode;
  onSend: (content: string) => void;
  disabled: boolean;
  model: string;
  onModelChange: (id: string) => void;
}

export default function AssistantNewExperience({
  mascot,
  corner,
  onSend,
  disabled,
  model,
  onModelChange,
}: AssistantNewExperienceProps) {
  const { data: session, status } = useSession();
  const [greeting, setGreeting] = useState<string | null>(null);
  const [value, setValue] = useState("");
  const [promptFocused, setPromptFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const placeholderRef = useRef<HTMLSpanElement>(null);
  const typewriterTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const phraseIndexRef = useRef(0);
  const characterIndexRef = useRef(0);
  const deletingRef = useRef(false);
  const greetingPickedRef = useRef(false);

  useEffect(() => {
    if (status === "loading" || greetingPickedRef.current) return;
    greetingPickedRef.current = true;
    setGreeting(pickAssistantGreeting(session?.user?.name, new Date()));
  }, [session?.user?.name, status]);

  useEffect(() => {
    const clearTypewriterTimeout = () => {
      if (typewriterTimeoutRef.current) clearTimeout(typewriterTimeoutRef.current);
      typewriterTimeoutRef.current = null;
    };

    clearTypewriterTimeout();

    if (value || promptFocused) return;

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const tick = () => {
      const phrase = TYPEWRITER_PHRASES[phraseIndexRef.current];
      const deleting = deletingRef.current;
      characterIndexRef.current += deleting ? -1 : 1;
      const nextLength = Math.max(0, Math.min(characterIndexRef.current, phrase.length));
      characterIndexRef.current = nextLength;

      if (placeholderRef.current) {
        placeholderRef.current.textContent = phrase.slice(0, nextLength);
      }

      let delay = deleting ? 14 : 22 + Math.random() * 25;
      if (!deleting && nextLength === phrase.length) {
        deletingRef.current = true;
        delay = 1400;
      } else if (deleting && nextLength === 0) {
        deletingRef.current = false;
        phraseIndexRef.current = (phraseIndexRef.current + 1) % TYPEWRITER_PHRASES.length;
        delay = 22 + Math.random() * 25;
      }

      typewriterTimeoutRef.current = setTimeout(tick, delay);
    };

    const updateMotionPreference = () => {
      clearTypewriterTimeout();
      if (motionQuery.matches) {
        if (placeholderRef.current) {
          placeholderRef.current.textContent = TYPEWRITER_PHRASES[phraseIndexRef.current];
        }
        return;
      }
      typewriterTimeoutRef.current = setTimeout(tick, 22 + Math.random() * 25);
    };

    updateMotionPreference();
    motionQuery.addEventListener("change", updateMotionPreference);
    return () => {
      motionQuery.removeEventListener("change", updateMotionPreference);
      clearTypewriterTimeout();
    };
  }, [promptFocused, value]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 58)}px`;
  }, [value]);

  const submit = () => {
    const content = value.trim();
    if (!content || disabled) return;
    onSend(content);
    setValue("");
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    submit();
  };

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setValue(event.target.value);
  };

  const showTypewriter = !value && !promptFocused;

  return (
    <main className={styles.experience}>
      {corner}
      <div className={styles.content}>
        {mascot && <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>{mascot}</div>}
        <h1 className={styles.heading} aria-label={greeting ?? undefined}>
          {greeting}
        </h1>
        <p className={styles.subtitle}>{ASSISTANT_NEW_COPY.subtitle}</p>

        <div className={styles.promptOuter} style={{ position: "relative" }}>
          <SkillMenu value={value} onPick={(command) => { setValue(`/${command} `); textareaRef.current?.focus(); }} />
          <div className={styles.promptInner}>
            <div className={styles.textareaArea}>
              <label className={styles.srOnly} htmlFor="assistant-new-prompt">
                {ASSISTANT_NEW_COPY.promptLabel}
              </label>
              <textarea
                ref={textareaRef}
                id="assistant-new-prompt"
                className={styles.textarea}
                value={value}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onFocus={() => setPromptFocused(true)}
                onBlur={() => setPromptFocused(false)}
                disabled={disabled}
                rows={1}
                aria-describedby="assistant-new-prompt-hint"
              />
              <span
                className={`${styles.typewriter} ${showTypewriter ? styles.typewriterVisible : ""}`}
                aria-hidden="true"
              >
                <span ref={placeholderRef} />
                <span className={styles.promptCaret} />
              </span>
              <span id="assistant-new-prompt-hint" className={styles.srOnly}>
                {ASSISTANT_NEW_COPY.promptHint}
              </span>
            </div>

            <div className={styles.promptToolbar}>
              <div className={styles.modelSelector}>
                <ModelSelector
                  value={model}
                  onChange={onModelChange}
                  disabled={disabled}
                  placement="top-right"
                />
              </div>

              <AnimatedSendButton disabled={disabled || !value.trim()} onClick={submit} />
            </div>
          </div>
        </div>

        <CapabilityChips
          disabled={disabled}
          onPick={(text) => {
            setValue(text);
            textareaRef.current?.focus();
          }}
        />
      </div>
    </main>
  );
}
