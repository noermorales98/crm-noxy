"use client";

/* eslint-disable @next/next/no-img-element -- The approved remote reference assets must use native img elements. */

import {
  type ChangeEvent,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { Image as ImageIcon, Layers3, Plus } from "lucide-react";
import ModelSelector from "@/app/assistant/[id]/_components/ModelSelector";
import AnimatedSendButton from "./AnimatedSendButton";
import PixelGrid from "./PixelGrid";
import styles from "../assistant-new.module.css";

const A = "https://qclay.design/lovable/sixsense";
const TYPEWRITER_PHRASES = [
  "Create a finance dashboard design",
  "Branding with M letter",
  "Liquid glass effect",
  "Loader animation",
  "SaaS landing page",
] as const;

interface AssistantNewExperienceProps {
  onSend: (content: string) => void;
  disabled: boolean;
  model: string;
  onModelChange: (id: string) => void;
  preferredKey: "1" | "2";
  onKeyChange: (key: "1" | "2") => void;
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
    label: "Editorial layout reference",
    className: styles.card1,
    entranceClassName: styles.cardEntranceOne,
    floatClassName: styles.cardFloatOne,
    width: 88.55,
    height: 68.46,
  },
  {
    src: "image-2.png",
    label: "Product interface reference",
    className: styles.card2,
    entranceClassName: styles.cardEntranceTwo,
    floatClassName: styles.cardFloatTwo,
    width: 105,
    height: 87,
  },
  {
    src: "image-3.png",
    label: "Brand identity reference",
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
  preferredKey,
  onKeyChange,
}: AssistantNewExperienceProps) {
  const [value, setValue] = useState("");
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const [promptFocused, setPromptFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const placeholderRef = useRef<HTMLSpanElement>(null);
  const typewriterTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const phraseIndexRef = useRef(0);
  const characterIndexRef = useRef(0);
  const deletingRef = useRef(false);

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

  const retainCardOnMouseLeave = (event: MouseEvent<HTMLButtonElement>) => {
    if (document.activeElement === event.currentTarget) return;
    const focusedIndex = Number(
      document.activeElement?.getAttribute("data-reference-card-index") ?? Number.NaN,
    );
    setHoveredCard(Number.isInteger(focusedIndex) ? focusedIndex : null);
  };

  const retainCardOnBlur = (event: FocusEvent<HTMLButtonElement>, index: number) => {
    if (!event.currentTarget.matches(":hover")) {
      setHoveredCard((active) => (active === index ? null : active));
    }
  };

  const showTypewriter = !value && !promptFocused;
  const isOpenRouter = model !== "chatbase";

  return (
    <main className={styles.experience}>
      <PixelGrid side="left" />
      <PixelGrid side="right" />

      <div className={styles.content}>
        <div className={styles.visualStage} aria-label="Design reference previews">
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

          <div
            className={`${styles.cards} ${hoveredCard !== null ? styles.cardsPaused : ""}`}
          >
            {CARDS.map((card, index) => (
              <button
                key={card.src}
                type="button"
                className={`${styles.referenceCard} ${card.className} ${
                  hoveredCard === index ? styles.referenceCardActive : ""
                }`}
                aria-label={card.label}
                data-reference-card-index={index}
                onMouseEnter={() => setHoveredCard(index)}
                onMouseLeave={retainCardOnMouseLeave}
                onFocus={() => setHoveredCard(index)}
                onBlur={(event) => retainCardOnBlur(event, index)}
              >
                <span className={`${styles.cardEntrance} ${card.entranceClassName}`}>
                  <img
                    className={`${styles.cardImage} ${card.floatClassName}`}
                    src={`${A}/${card.src}`}
                    alt=""
                    width={card.width}
                    height={card.height}
                  />
                </span>
              </button>
            ))}
          </div>
        </div>

        <h1 className={styles.heading}>
          Let&apos;s find the right
          <span>references for your work</span>
        </h1>
        <p className={styles.subtitle}>What type of references are you looking for?</p>

        <div className={styles.promptOuter}>
          <div className={styles.promptInner}>
            <div className={styles.textareaArea}>
              <label className={styles.srOnly} htmlFor="assistant-new-prompt">
                Describe the references you are looking for
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
                Press Enter to send or Shift and Enter for a new line.
              </span>
            </div>

            <div className={styles.promptToolbar}>
              <div className={styles.toolbarLeft}>
                <div className={styles.modelSelector}>
                  <ModelSelector
                    value={model}
                    onChange={onModelChange}
                    disabled={disabled}
                    placement="top-right"
                  />
                </div>

                {isOpenRouter && (
                  <button
                    type="button"
                    className={`${styles.keyToggle} ${
                      preferredKey === "2" ? styles.keyToggleSecondary : ""
                    }`}
                    onClick={() => onKeyChange(preferredKey === "1" ? "2" : "1")}
                    disabled={disabled}
                    aria-label={`Use API key ${preferredKey === "1" ? "2" : "1"}`}
                    title={`Using key ${preferredKey}`}
                  >
                    K{preferredKey}
                  </button>
                )}

                <button
                  type="button"
                  className={styles.secondaryControl}
                  aria-label="Add an image reference"
                  disabled={disabled}
                >
                  <ImageIcon size={16} strokeWidth={1.8} />
                </button>
                <button
                  type="button"
                  className={styles.secondaryControl}
                  aria-label="Add a layered reference"
                  disabled={disabled}
                >
                  <Layers3 size={16} strokeWidth={1.8} />
                </button>
                <span className={styles.divider} aria-hidden="true" />
                <button
                  type="button"
                  className={styles.addButton}
                  aria-label="Add a reference"
                  disabled={disabled}
                >
                  <Plus size={16} strokeWidth={1.8} />
                </button>
                <button type="button" className={styles.tag} disabled={disabled}>
                  UI Design
                </button>
              </div>

              <AnimatedSendButton disabled={disabled || !value.trim()} onClick={submit} />
            </div>
          </div>
        </div>
      </div>

      <footer className={styles.footer}>
        By sending a message to ChatBot, you agree to our{" "}
        {/* Replace fragment destinations when legal routes are available. */}
        <a href="#terms">Terms</a> and have read our <a href="#privacy">Privacy Policy</a>.
      </footer>
    </main>
  );
}
