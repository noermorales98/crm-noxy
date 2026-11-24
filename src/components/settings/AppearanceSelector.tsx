"use client";

import { useAppearance } from "@/src/context/AppearanceContext";
import { BORDER_STYLES, MODES, RADII, type BorderStyle, type RadiusScale } from "@/src/lib/appearance";

const CHOICE =
  "flex min-h-11 flex-col items-start gap-1 rounded-control px-3 py-2 text-left outline-none transition-colors hover:bg-nav-hover focus-visible:ring-2 focus-visible:ring-focus motion-reduce:transition-none";

function Group({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-semibold text-text-primary">{title}</legend>
      {hint && <p className="text-sm text-text-secondary">{hint}</p>}
      <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
    </fieldset>
  );
}

/** Modo (automático, claro, oscuro), radio de esquinas y estilo de bordes. Cambia al instante y queda guardado en este navegador. */
export default function AppearanceSelector() {
  const { appearance, setAppearance } = useAppearance();
  return (
    <div className="flex flex-col gap-6">
      <Group title="Modo" hint="Automático sigue el modo claro u oscuro de tu dispositivo.">
        {MODES.map((m) => (
          <button key={m.value} type="button" aria-pressed={appearance.mode === m.value} onClick={() => setAppearance({ mode: m.value })} className={`${CHOICE} ${appearance.mode === m.value ? "bg-nav-active" : ""}`}>
            <span className="text-sm font-semibold text-text-primary">{m.label}</span>
            <span className="text-xs text-text-secondary">{m.hint}</span>
          </button>
        ))}
      </Group>

      <Group title="Esquinas" hint="Qué tan redondeados se ven botones, campos y tarjetas.">
        {(Object.keys(RADII) as RadiusScale[]).map((key) => (
          <button key={key} type="button" aria-pressed={appearance.radius === key} onClick={() => setAppearance({ radius: key })} className={`${CHOICE} ${appearance.radius === key ? "bg-nav-active" : ""}`}>
            <span aria-hidden="true" className="h-8 w-14 border-2 border-text-secondary bg-surface-elevated" style={{ borderRadius: RADII[key].surface }} />
            <span className="text-sm font-semibold text-text-primary">{RADII[key].label}</span>
          </button>
        ))}
      </Group>

      <Group title="Bordes" hint="Las líneas que separan tarjetas, paneles y listas.">
        {BORDER_STYLES.map((b: { value: BorderStyle; label: string; hint: string }) => (
          <button key={b.value} type="button" aria-pressed={appearance.borders === b.value} onClick={() => setAppearance({ borders: b.value })} className={`${CHOICE} ${appearance.borders === b.value ? "bg-nav-active" : ""}`}>
            <span
              aria-hidden="true"
              className="h-8 w-14 rounded-control bg-surface-elevated"
              style={{ border: b.value === "none" ? "none" : `1px solid ${b.value === "soft" ? "color-mix(in srgb, var(--color-text-secondary) 25%, transparent)" : "var(--color-text-secondary)"}`, boxShadow: b.value === "none" ? "0 1px 3px rgba(11,11,24,.18)" : undefined }}
            />
            <span className="text-sm font-semibold text-text-primary">{b.label}</span>
            <span className="text-xs text-text-secondary">{b.hint}</span>
          </button>
        ))}
      </Group>
    </div>
  );
}
