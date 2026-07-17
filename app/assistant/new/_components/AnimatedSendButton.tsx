"use client";

/* eslint-disable @next/next/no-img-element -- The approved remote SVG assets must use native img elements. */

import { useCallback, useEffect, useRef, useState } from "react";
import { ASSISTANT_NEW_COPY } from "./assistant-new-copy";
import styles from "../assistant-new.module.css";

const A = "https://qclay.design/lovable/sixsense";

interface AnimatedSendButtonProps {
  disabled: boolean;
  onClick: () => void;
}

export default function AnimatedSendButton({
  disabled,
  onClick,
}: AnimatedSendButtonProps) {
  const ringRef = useRef<HTMLSpanElement>(null);
  const angleRef = useRef(0);
  const speedRef = useRef(0);
  const frameRef = useRef(0);
  const timestampRef = useRef(0);
  const activeRef = useRef(false);
  const hoverRef = useRef(false);
  const focusRef = useRef(false);
  const reducedMotionRef = useRef(false);
  const [arrowToggle, setArrowToggle] = useState(0);

  const runFrame = useCallback(function animateRing(timestamp: number) {
    const previousTimestamp = timestampRef.current || timestamp;
    const deltaTime = Math.min(timestamp - previousTimestamp, 64);
    timestampRef.current = timestamp;

    const active = activeRef.current;
    const targetSpeed = active ? 360 / 1500 : 0;
    const tau = active ? 250 : 700;
    const k = 1 - Math.exp(-deltaTime / tau);
    const speed = speedRef.current + (targetSpeed - speedRef.current) * k;
    const angle = (angleRef.current + speed * deltaTime) % 360;

    speedRef.current = speed;
    angleRef.current = angle;
    ringRef.current?.style.setProperty("--ring-angle", `${angle}deg`);

    if (targetSpeed === 0 && Math.abs(speed) < 0.0005) {
      speedRef.current = 0;
      timestampRef.current = 0;
      frameRef.current = 0;
      return;
    }

    frameRef.current = requestAnimationFrame(animateRing);
  }, []);

  const startFrame = useCallback(() => {
    if (reducedMotionRef.current || frameRef.current) return;
    timestampRef.current = 0;
    frameRef.current = requestAnimationFrame(runFrame);
  }, [runFrame]);

  const updateActive = useCallback(() => {
    const nextActive = hoverRef.current || focusRef.current;
    if (nextActive === activeRef.current) return;

    activeRef.current = nextActive;
    if (nextActive) {
      setArrowToggle((value) => value + 1);
    }
    startFrame();
  }, [startFrame]);

  useEffect(() => {
    if (!disabled) return;
    hoverRef.current = false;
    focusRef.current = false;
    updateActive();
  }, [disabled, updateActive]);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotionPreference = () => {
      reducedMotionRef.current = query.matches;
      if (query.matches && frameRef.current) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = 0;
        timestampRef.current = 0;
        speedRef.current = 0;
      } else if (activeRef.current) {
        startFrame();
      }
    };

    updateMotionPreference();
    query.addEventListener("change", updateMotionPreference);
    return () => {
      query.removeEventListener("change", updateMotionPreference);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      frameRef.current = 0;
    };
  }, [startFrame]);

  return (
    <button
      type="button"
      className={styles.sendButton}
      onClick={onClick}
      onMouseEnter={() => {
        hoverRef.current = true;
        updateActive();
      }}
      onMouseLeave={() => {
        hoverRef.current = false;
        updateActive();
      }}
      onFocus={() => {
        focusRef.current = true;
        updateActive();
      }}
      onBlur={() => {
        focusRef.current = false;
        updateActive();
      }}
      disabled={disabled}
      aria-label={ASSISTANT_NEW_COPY.sendLabel}
    >
      <span className={styles.sendHalo} aria-hidden="true" />
      <span className={styles.sendFallbackBorder} aria-hidden="true" />
      <span ref={ringRef} className={styles.sendRing} aria-hidden="true" />
      <span className={styles.sendInner} aria-hidden="true">
        <img className={styles.sendDots} src={`${A}/dots.svg`} alt="" width="36" height="36" />
        {arrowToggle > 0 && (
          <span key={`shine-${arrowToggle}`} className={styles.sendShine} />
        )}
        <span
          key={`arrows-${arrowToggle}`}
          className={arrowToggle > 0 ? styles.arrowCycle : styles.arrowRest}
        >
          <img
            className={styles.arrowOutgoing}
            src={`${A}/arrow-up.svg`}
            alt=""
            width="16"
            height="16"
          />
          <img
            className={styles.arrowIncoming}
            src={`${A}/arrow-up.svg`}
            alt=""
            width="16"
            height="16"
          />
        </span>
      </span>
    </button>
  );
}
