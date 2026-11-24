"use client";

import { useEffect, useState } from "react";
import styles from "../assistant-chat.module.css";

// Frases que rotan mientras llega la primera palabra. Nunca avisan de que algo tarda: solo describen que se está trabajando.
const PHRASES = [
  "Pensando…",
  "Revisando tu CRM…",
  "Buscando en tus contactos y tratos…",
  "Ordenando las ideas…",
  "Cruzando los datos…",
  "Preparando una respuesta…",
  "Armando los detalles…",
  "Repasando tus clientes y contenido…",
  "Dándole forma a la respuesta…",
  "Afinando las palabras…",
  "Poniendo todo en orden…",
];

const STEP_MS = 2400;

export default function ThinkingStatus() {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const started = Date.now();
    const timer = setInterval(() => setElapsed(Date.now() - started), STEP_MS);
    return () => clearInterval(timer);
  }, []);

  // Recorre la lista una y otra vez; la primera siempre es «Pensando…».
  const step = Math.floor(elapsed / STEP_MS);
  const phrase = PHRASES[step % PHRASES.length];

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
