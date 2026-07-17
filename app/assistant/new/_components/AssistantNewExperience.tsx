"use client";

/* eslint-disable @next/next/no-img-element -- The approved remote reference assets must use native img elements. */

import { type ChangeEvent, type KeyboardEvent, useEffect, useRef, useState } from "react";
import ModelSelector from "@/app/assistant/[id]/_components/ModelSelector";
import AnimatedSendButton from "./AnimatedSendButton";
import { ASSISTANT_NEW_COPY } from "./assistant-new-copy";
import PixelGrid from "./PixelGrid";
import styles from "../assistant-new.module.css";

const A = "https://qclay.design/lovable/sixsense";
const TYPEWRITER_PHRASES = ASSISTANT_NEW_COPY.prompts;

interface AssistantNewExperienceProps {
  onSend: (content: string) => void;
  disabled: boolean;
  model: string;
  onModelChange: (id: string) => void;
}

interface LayerAsset {
  src: string;
  className: string;
  width: number;
  height: number;
}

interface CardAsset {
  src: string;
  label: string;
  className: string;
  entranceClassName: string;
  floatClassName: string;
  width: number;
  height: number;
}

const LAYERS: readonly LayerAsset[] = [
  { src: "blue-light-2.svg", className: styles.blueLight2, width: 104, height: 170 },
  { src: "blue-light.svg", className: styles.blueLight, width: 104, height: 170 },
  { src: "light-1.svg", className: styles.light1, width: 180.5, height: 124.5 },
  { src: "folder-3.svg", className: styles.folder3, width: 69.71, height: 45 },
  { src: "small-light-2.svg", className: styles.smallLight2, width: 39, height: 17 },
  { src: "small-light.svg", className: styles.smallLight, width: 39, height: 25 },
  { src: "folder-2.svg", className: styles.folder2, width: 79, height: 51 },
  { src: "light-2.svg", className: styles.light2, width: 109, height: 162.5 },
  { src: "folder-1.svg", className: styles.folder1, width: 91, height: 58 },
  { src: "folder-0.svg?v=2", className: styles.folder0, width: 113.67, height: 76.5 },
] as const;

const CARDS: readonly CardAsset[] = [
  {
    src: "image-1.png",
    label: ASSISTANT_NEW_COPY.cards[0],
    className: styles.card1,
    entranceClassName: styles.cardEntranceOne,
    floatClassName: styles.cardFloatOne,
    width: 88.55,
    height: 68.46,
  },
  {
    src: "image-2.png",
    label: ASSISTANT_NEW_COPY.cards[1],
    className: styles.card2,
    entranceClassName: styles.cardEntranceTwo,
    floatClassName: styles.cardFloatTwo,
    width: 105,
    height: 87,
  },
  {
    src: "image-3.png",
    label: ASSISTANT_NEW_COPY.cards[2],
    className: styles.card3,
    entranceClassName: styles.cardEntranceThree,
    floatClassName: styles.cardFloatThree,
    width: 105,
    height: 96,
  },
] as const;

export default function AssistantNewExperience({
  onSend,
  disabled,
  model,
  onModelChange,
}: AssistantNewExperienceProps) {
  const [value, setValue] = useState("");
  const [promptFocused, setPromptFocused] = useState(false);
  const [showRightGrid, setShowRightGrid] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const placeholderRef = useRef<HTMLSpanElement>(null);
  const typewriterTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const phraseIndexRef = useRef(0);
  const characterIndexRef = useRef(0);
  const deletingRef = useRef(false);

  useEffect(() => {
    const query = window.matchMedia("(min-width: 768px)");
    const updateRightGridVisibility = () => setShowRightGrid(query.matches);

    updateRightGridVisibility();
    query.addEventListener("change", updateRightGridVisibility);
    return () => query.removeEventListener("change", updateRightGridVisibility);
  }, []);

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
      <PixelGrid side="left" />
      {showRightGrid && <PixelGrid side="right" />}

      <div className={styles.content}>
        <div className={styles.visualStage} aria-label={ASSISTANT_NEW_COPY.visualLabel}>
          <div className={styles.folderComposition} aria-hidden="true">
            {LAYERS.map((layer) => (
              <img
                key={layer.src}
                className={`${styles.layer} ${layer.className}`}
                src={`${A}/${layer.src}`}
                alt=""
                width={layer.width}
                height={layer.height}
              />
            ))}
          </div>

          <div className={styles.cards}>
            {CARDS.map((card) => (
              <figure
                key={card.src}
                className={`${styles.referenceCard} ${card.className}`}
              >
                <span className={`${styles.cardEntrance} ${card.entranceClassName}`}>
                  <img
                    className={`${styles.cardImage} ${card.floatClassName}`}
                    src={`${A}/${card.src}`}
                    alt={card.label}
                    width={card.width}
                    height={card.height}
                  />
                </span>
              </figure>
            ))}
          </div>
        </div>

        <h1 className={styles.heading} aria-label={ASSISTANT_NEW_COPY.heading}>
          {ASSISTANT_NEW_COPY.headingLines[0]}
          <span>{ASSISTANT_NEW_COPY.headingLines[1]}</span>
        </h1>
        <p className={styles.subtitle}>{ASSISTANT_NEW_COPY.subtitle}</p>

        <div className={styles.promptOuter}>
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
      </div>

      <footer className={styles.footer}>
        {ASSISTANT_NEW_COPY.legalPrefix}{" "}
        {/* Reemplazar los fragmentos cuando existan rutas legales en el CRM. */}
        <a href="#terms">{ASSISTANT_NEW_COPY.terms}</a>{" "}
        {ASSISTANT_NEW_COPY.legalJoin}{" "}
        <a href="#privacy">{ASSISTANT_NEW_COPY.privacy}</a>.
      </footer>
    </main>
  );
}
