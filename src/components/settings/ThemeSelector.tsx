"use client";

import { Check, Palette } from "lucide-react";
import { useCrmTheme } from "@/src/context/CrmThemeContext";

export default function ThemeSelector() {
  const { themeId, themes, saveStatus, message, selectTheme } = useCrmTheme();
  const statusMessage = saveStatus === "loading" ? "Cargando tu tema…" : message;

  return (
    <section aria-labelledby="appearance-heading">
      <div className="flex items-start gap-3">
        <span
          className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-nav-active text-action-primary"
          aria-hidden="true"
        >
          <Palette size={18} />
        </span>
        <div>
          <h2 id="appearance-heading" className="text-lg font-bold text-text-primary">Apariencia</h2>
          <p className="mt-1 max-w-[68ch] text-sm text-text-secondary">
            Elige una paleta clara para tu espacio de trabajo. Se aplicará al instante y quedará vinculada a tu cuenta.
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {themes.map((themeOption) => {
          const selected = themeOption.id === themeId;
          const { tokens } = themeOption;

          return (
            <button
              key={themeOption.id}
              type="button"
              aria-pressed={selected}
              onClick={() => selectTheme(themeOption.id)}
              className={`group min-h-44 rounded-surface border p-3 text-left transition-colors duration-200 motion-reduce:transition-none ${
                selected
                  ? "border-action-primary bg-nav-hover"
                  : "border-border-subtle bg-surface-elevated hover:border-action-primary/45 hover:bg-nav-hover"
              }`}
            >
              <span
                className="block overflow-hidden rounded-control border"
                style={{ backgroundColor: tokens.surfaceApp, borderColor: tokens.borderSubtle }}
                aria-hidden="true"
              >
                <span className="flex h-20">
                  <span className="w-[29%] p-2" style={{ backgroundColor: tokens.surfaceSidebar }}>
                    <span className="block h-2 w-8 rounded-sm" style={{ backgroundColor: tokens.textPrimary }} />
                    <span className="mt-2 block h-2 w-full rounded-sm" style={{ backgroundColor: tokens.navActive }} />
                    <span className="mt-1.5 block h-2 w-4/5 rounded-sm" style={{ backgroundColor: tokens.navHover }} />
                  </span>
                  <span className="flex-1 p-2.5">
                    <span
                      className="block h-full rounded-md border p-2"
                      style={{ backgroundColor: tokens.surfaceElevated, borderColor: tokens.borderSubtle }}
                    >
                      <span className="block h-2 w-3/5 rounded-sm" style={{ backgroundColor: tokens.textPrimary }} />
                      <span className="mt-2 block h-2 w-4/5 rounded-sm" style={{ backgroundColor: tokens.borderSubtle }} />
                      <span
                        className="mt-3 inline-flex h-5 items-center rounded px-2 text-[8px] font-bold"
                        style={{ backgroundColor: tokens.actionPrimary, color: tokens.actionPrimaryForeground }}
                      >
                        Acción
                      </span>
                    </span>
                  </span>
                </span>
              </span>

              <span className="mt-3 flex items-start justify-between gap-3">
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-text-primary">{themeOption.label}</span>
                  <span className="mt-0.5 block text-xs leading-5 text-text-secondary">{themeOption.description}</span>
                </span>
                <span
                  className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                    selected
                      ? "border-action-primary bg-action-primary text-action-primary-foreground"
                      : "border-border-subtle bg-surface-elevated text-transparent"
                  }`}
                  aria-hidden="true"
                >
                  <Check size={13} strokeWidth={3} />
                </span>
              </span>

              <span className="mt-3 flex gap-1.5" aria-hidden="true">
                {themeOption.swatches.map((color, index) => (
                  <span
                    key={`${themeOption.id}-${color}-${index}`}
                    className="h-4 flex-1 rounded-sm border border-black/10"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </span>
            </button>
          );
        })}
      </div>

      <p
        className={`mt-3 min-h-5 text-xs ${saveStatus === "error" ? "text-red-600" : "text-text-secondary"}`}
        role="status"
        aria-live="polite"
      >
        {statusMessage}
      </p>
    </section>
  );
}
