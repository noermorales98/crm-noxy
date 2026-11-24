"use client";

import { useEffect, useState } from "react";
import styles from "../assistant-chat.module.css";

// Frases que rotan mientras llega la primera palabra, para que la espera se sienta activa. Al pasar de cierto tiempo
// cambian a mensajes honestos de que tarda más de lo normal.
const PHRASES = [
  "Pensando…",
  "Revisando tu CRM…",
  "Buscando en tus contactos y tratos…",
  "Ordenando las ideas…",
  "Preparando una respuesta…",
  "Casi listo…",
];
const SLOW_PHRASES = ["Esto tarda un poco más de lo normal…", "El modelo está ocupado, sigo esperando…", "Si tarda mucho, prueba «reintentar» con otro modelo."];

const STEP_MS = 2400;
const SLOW_AFTER_MS = 12000;

export default function ThinkingStatus() {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const started = Date.now();
    const timer = setInterval(() => setElapsed(Date.now() - started), STEP_MS);
    return () => clearInterval(timer);
  }, []);

  const step = Math.floor(elapsed / STEP_MS);
  const slow = elapsed >= SLOW_AFTER_MS;
  const phrase = slow ? SLOW_PHRASES[(step - Math.ceil(SLOW_AFTER_MS / STEP_MS)) % SLOW_PHRASES.length] : PHRASES[Math.min(step, PHRASES.length - 1)];

  return (
    <div className={styles.thinking} role="status" aria-live="polite">
      <span className={styles.thinkingDots} aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <span key={phrase} className={styles.thinkingText}>{phrase}</span>
    </div>
  );
}
