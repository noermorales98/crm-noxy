"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Blobatar } from "@blobatar/react";
import ChatBlobatar, { randomBlobSeed, type BlobMood } from "@/src/components/ai/ChatBlobatar";

const OPTIONS = 8;
export const CHAT_TITLE_MAX = 60;

/**
 * La criatura del chat como botón: al hacer clic se abre un cuadro para elegir otra cara y ponerle nombre al chat.
 * El nombre vacío significa «automático» (se toma del primer mensaje).
 */
export default function ChatIdentityPicker({
  seed,
  onSeedChange,
  title,
  onTitleChange,
  size,
  mood,
}: {
  seed: string;
  onSeedChange: (seed: string) => void;
  title: string;
  onTitleChange: (title: string) => void;
  size: number;
  mood: BlobMood;
}) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<string[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);
  const nameId = useId();

  const shuffle = () => setOptions(Array.from({ length: OPTIONS }, randomBlobSeed));

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} style={{ position: "relative", display: "inline-flex", flexDirection: "column", alignItems: "center" }}>
      <button
        type="button"
        onClick={() => {
          if (!open) shuffle();
          setOpen((v) => !v);
        }}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Cambiar la cara o el nombre de este chat"
        title="Cambiar cara o nombre del chat"
        style={{ background: "transparent", border: 0, padding: 0, borderRadius: "50%", cursor: "pointer" }}
      >
        <ChatBlobatar seed={seed} size={size} mood={mood} follow />
      </button>
      {title && <span style={{ marginTop: 6, maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 13, color: "#6E6E73" }}>{title}</span>}

      {open && (
        <div
          role="dialog"
          aria-label="Personalizar chat"
          style={{
            position: "absolute",
            top: "calc(100% + 10px)",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 60,
            width: 280,
            padding: 14,
            borderRadius: 16,
            border: "1px solid rgba(0,0,0,0.1)",
            background: "#FFFFFF",
            color: "#1D1D1F",
            boxShadow: "0 8px 32px rgba(0,0,0,0.14)",
            textAlign: "left",
          }}
        >
          <label htmlFor={nameId} style={{ display: "block", fontSize: 11, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "#6E6E73", marginBottom: 6 }}>
            Nombre del chat
          </label>
          <input
            id={nameId}
            value={title}
            maxLength={CHAT_TITLE_MAX}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Automático (con tu primer mensaje)"
            style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.15)", fontSize: 14, background: "#FFFFFF", color: "#1D1D1F" }}
          />

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "14px 0 8px" }}>
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "#6E6E73" }}>Cara</span>
            <button type="button" onClick={shuffle} style={{ background: "transparent", border: 0, cursor: "pointer", fontSize: 12, color: "#3545D6" }}>
              Ver otras
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
            {[seed, ...options.filter((o) => o !== seed)].slice(0, OPTIONS).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => onSeedChange(option)}
                aria-label="Usar esta cara"
                aria-pressed={option === seed}
                style={{
                  display: "grid",
                  placeItems: "center",
                  padding: 4,
                  borderRadius: 12,
                  cursor: "pointer",
                  // Mismo lenguaje que el resto del sistema: borde fino y, al elegir, fondo suave de selección.
                  background: option === seed ? "var(--color-nav-active, #EBEDFA)" : "transparent",
                  border: `1px solid ${option === seed ? "var(--color-line-strong, var(--color-line, #C9CEDC))" : "var(--color-line, rgba(0,0,0,0.08))"}`,
                  transition: "background-color 150ms ease, border-color 150ms ease",
                }}
              >
                <Blobatar name={option} size={44} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
