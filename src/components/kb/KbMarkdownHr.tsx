"use client";

import type { KbHrVariant } from "@/src/lib/kb-markdown-themes";

interface Props {
  variant: KbHrVariant;
}

export default function KbMarkdownHr({ variant }: Props) {
  return (
    <div className={`kb-hr kb-hr--${variant}`} role="separator" aria-hidden>
      <svg viewBox="0 0 400 24" preserveAspectRatio="xMidYMid meet" className="kb-hr-svg">
        {variant === "loop" && (
          <path
            d="M8 12 H120 Q128 4 136 12 Q144 20 152 12 Q160 4 168 12 Q176 20 184 12 Q192 4 200 12 Q208 20 216 12 Q224 4 232 12 Q240 20 248 12 Q256 4 264 12 Q272 20 280 12 H392"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        )}
        {variant === "scribble" && (
          <path
            d="M8 12 H80 Q95 6 110 14 Q125 22 140 10 Q155 4 170 14 Q185 24 200 11 Q215 5 230 15 Q245 21 260 10 Q275 6 290 14 Q305 20 320 11 H392"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        )}
        {variant === "dots" && (
          <>
            <line x1="8" y1="12" x2="160" y2="12" stroke="currentColor" strokeWidth="1" />
            <circle cx="176" cy="12" r="2.5" fill="currentColor" />
            <circle cx="200" cy="12" r="2.5" fill="currentColor" />
            <circle cx="224" cy="12" r="2.5" fill="currentColor" />
            <line x1="240" y1="12" x2="392" y2="12" stroke="currentColor" strokeWidth="1" />
          </>
        )}
        {variant === "diamond" && (
          <>
            <line x1="8" y1="12" x2="175" y2="12" stroke="currentColor" strokeWidth="1" />
            <path d="M200 6 L206 12 L200 18 L194 12 Z" fill="currentColor" />
            <line x1="225" y1="12" x2="392" y2="12" stroke="currentColor" strokeWidth="1" />
          </>
        )}
        {variant === "line" && (
          <line x1="8" y1="12" x2="392" y2="12" stroke="currentColor" strokeWidth="1" />
        )}
        {variant === "wave" && (
          <path
            d="M8 12 C40 4 72 20 104 12 S168 4 200 12 S264 20 296 12 S360 4 392 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        )}
        {variant === "stars" && (
          <>
            <line x1="8" y1="12" x2="150" y2="12" stroke="currentColor" strokeWidth="1" />
            <path d="M176 8 L178 11 L181 11 L179 13 L180 16 L176 14 L172 16 L173 13 L171 11 L174 11 Z" fill="currentColor" />
            <path d="M200 8 L202 11 L205 11 L203 13 L204 16 L200 14 L196 16 L197 13 L195 11 L198 11 Z" fill="currentColor" />
            <path d="M224 8 L226 11 L229 11 L227 13 L228 16 L224 14 L220 16 L221 13 L219 11 L222 11 Z" fill="currentColor" />
            <line x1="250" y1="12" x2="392" y2="12" stroke="currentColor" strokeWidth="1" />
          </>
        )}
        {variant === "flourish" && (
          <>
            <path
              d="M8 12 H60 M60 12 Q52 6 44 12 Q36 18 28 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.25"
              strokeLinecap="round"
            />
            <line x1="100" y1="12" x2="300" y2="12" stroke="currentColor" strokeWidth="1" />
            <path
              d="M340 12 H392 M340 12 Q348 6 356 12 Q364 18 372 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.25"
              strokeLinecap="round"
            />
          </>
        )}
        {variant === "dash" && (
          <line
            x1="8"
            y1="12"
            x2="392"
            y2="12"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="8 6"
            strokeLinecap="round"
          />
        )}
        {variant === "double" && (
          <>
            <line x1="8" y1="10" x2="392" y2="10" stroke="currentColor" strokeWidth="1" />
            <line x1="8" y1="14" x2="392" y2="14" stroke="currentColor" strokeWidth="1" />
          </>
        )}
        {variant === "arrow" && (
          <>
            <line x1="8" y1="12" x2="360" y2="12" stroke="currentColor" strokeWidth="1.25" />
            <path
              d="M360 12 L374 12 M368 7 L374 12 L368 17"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.25"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        )}
      </svg>
    </div>
  );
}
