"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { SmilePlus } from "lucide-react";
import {
  KB_COLOR_PRESETS,
  DEFAULT_ICON_COLOR,
  DEFAULT_ICON_BG,
  searchHugeIcons,
  getHugeIconComponent,
  toHugeIconValue,
  parseHugeIconName,
  type KbIconSelection,
} from "@/src/lib/kb-icons";

const EMOJIS = [
  "📝", "📄", "📋", "📊", "📈", "📉", "💡", "⚡", "🎯", "🚀", "🔑", "🔒", "🔓",
  "👤", "👥", "🤝", "💼", "🏢", "📅", "📆", "⏰", "📌", "🗂️", "📂", "📁",
  "✅", "❌", "⚠️", "💰", "💵", "📦", "🎁", "🏆", "🌟", "⭐", "✨", "🎨",
  "🔧", "⚙️", "🛠️", "🔬", "🧪", "💻", "📱", "📚", "🗺️", "🎭", "📡", "🏗️",
];

interface Props {
  currentEmoji: string;
  currentIconColor: string | null;
  currentIconBg: string | null;
  onSelect: (selection: KbIconSelection) => void;
  onClose: () => void;
}

export default function KbIconPicker({
  currentEmoji,
  currentIconColor,
  currentIconBg,
  onSelect,
  onClose,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<"emoji" | "icon">(
    currentEmoji.startsWith("icon:") ? "icon" : "emoji"
  );
  const [query, setQuery] = useState("");
  const [iconOffset, setIconOffset] = useState(0);
  const [iconColor, setIconColor] = useState(currentIconColor || DEFAULT_ICON_COLOR);
  const [iconBg, setIconBg] = useState(currentIconBg || DEFAULT_ICON_BG);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    setTimeout(() => document.addEventListener("mousedown", h), 50);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose]);

  const iconNames = useMemo(() => searchHugeIcons(query, 64, iconOffset), [query, iconOffset]);

  const apply = useCallback(
    (emoji: string) => {
      onSelect({ emoji, iconColor, iconBg });
      onClose();
    },
    [iconColor, iconBg, onSelect, onClose]
  );

  const applyColors = useCallback(
    (nextColor: string, nextBg: string) => {
      setIconColor(nextColor);
      setIconBg(nextBg);
      onSelect({ emoji: currentEmoji, iconColor: nextColor, iconBg: nextBg });
    },
    [currentEmoji, onSelect]
  );

  const loadMore = () => {
    if (iconNames.length >= 64) setIconOffset((o) => o + 64);
  };

  return (
    <div
      ref={ref}
      className="absolute top-full left-0 mt-2 z-50 bg-surface-elevated rounded-lg border border-border-subtle p-4 w-80 max-h-[70vh] overflow-hidden flex flex-col"
    >
      <div className="flex gap-1 mb-3 p-0.5 bg-surface-sidebar rounded-lg shrink-0">
        {(["emoji", "icon"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => { setTab(t); setIconOffset(0); }}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
              tab === t ? "bg-surface-elevated text-text-primary" : "text-text-secondary hover:text-text-primary"
            }`}
          >
            {t === "emoji" ? "Emojis" : "Iconos"}
          </button>
        ))}
      </div>

      <div className="mb-3 shrink-0">
        <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-2">Colores</p>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {KB_COLOR_PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              title={p.label}
              onClick={() => applyColors(p.iconColor, p.iconBg)}
              className={`w-7 h-7 rounded-lg border-2 transition-all ${
                iconColor === p.iconColor && iconBg === p.iconBg ? "border-action-primary scale-105" : "border-transparent"
              }`}
              style={{ backgroundColor: p.iconBg }}
            >
              <span className="block w-2 h-2 rounded-full mx-auto" style={{ backgroundColor: p.iconColor }} />
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <label className="flex-1 text-[10px] text-text-secondary">
            Icono
            <input
              type="color"
              value={iconColor}
              onChange={(e) => applyColors(e.target.value, iconBg)}
              className="w-full h-7 rounded cursor-pointer mt-0.5"
            />
          </label>
          <label className="flex-1 text-[10px] text-text-secondary">
            Fondo
            <input
              type="color"
              value={iconBg}
              onChange={(e) => applyColors(iconColor, e.target.value)}
              className="w-full h-7 rounded cursor-pointer mt-0.5"
            />
          </label>
        </div>
      </div>

      {tab === "emoji" ? (
        <div className="overflow-y-auto min-h-0">
          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => apply("")}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-text-secondary hover:bg-nav-hover"
              title="Sin icono"
            >
              <SmilePlus size={14} />
            </button>
            {EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => apply(e)}
                className={`w-8 h-8 flex items-center justify-center rounded-lg text-xl hover:bg-nav-hover ${
                  currentEmoji === e ? "ring-1 ring-action-primary" : ""
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col min-h-0 flex-1">
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setIconOffset(0); }}
            placeholder="Buscar icono..."
            className="crm-input mb-2 shrink-0 text-xs py-1.5"
          />
          <div
            className="overflow-y-auto min-h-0 flex-1"
            onScroll={(e) => {
              const el = e.currentTarget;
              if (el.scrollTop + el.clientHeight >= el.scrollHeight - 24) loadMore();
            }}
          >
            <div className="flex flex-wrap gap-1">
              {iconNames.map((name) => {
                const ic = getHugeIconComponent(name);
                if (!ic) return null;
                const val = toHugeIconValue(name);
                const selected = currentEmoji === val;
                return (
                  <button
                    key={name}
                    type="button"
                    title={name}
                    onClick={() => apply(val)}
                    className={`w-9 h-9 flex items-center justify-center rounded-lg hover:bg-nav-hover transition-colors ${
                      selected ? "ring-1 ring-action-primary" : ""
                    }`}
                    style={{ backgroundColor: iconBg }}
                  >
                    <HugeiconsIcon icon={ic as never} size={16} color={iconColor} />
                  </button>
                );
              })}
            </div>
            {iconNames.length === 0 && (
              <p className="text-xs text-text-secondary py-2 text-center">Sin resultados</p>
            )}
          </div>
        </div>
      )}

      {tab === "icon" && parseHugeIconName(currentEmoji) && (
        <p className="text-[10px] text-text-secondary mt-2 shrink-0 truncate">
          Actual: {parseHugeIconName(currentEmoji)}
        </p>
      )}
    </div>
  );
}
