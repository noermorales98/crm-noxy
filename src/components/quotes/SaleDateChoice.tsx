"use client";

export type SaleDateOption = { value: string; day: string; dateLabel: string; reason: string };

/** Pregunta cuál de varias fechas es la de la venta. Una sola fecha por venta: la que se elija es la que cuenta en el historial. */
export function SaleDateChoice({ choices, value, onChange }: { choices: SaleDateOption[]; value: string; onChange: (value: string) => void }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-sm font-semibold text-text-primary">¿Cuál es la fecha correcta de la venta?</legend>
      <p className="mb-1 text-xs text-text-secondary">Hay fechas distintas. La que elijas es la que cuenta en el historial y en el cierre del mes; las demás se quedan como datos de pago.</p>
      {choices.map((choice) => (
        <label key={choice.value} className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-control border px-3 py-2 text-sm ${value === choice.value ? "border-action-ink bg-nav-active" : "border-line hover:bg-nav-hover"}`}>
          <input type="radio" name="sale-date" value={choice.value} checked={value === choice.value} onChange={() => onChange(choice.value)} className="size-4 shrink-0 accent-[var(--color-brand-indigo)]" />
          <span className="min-w-0">
            <span className="block font-semibold text-text-primary">{choice.dateLabel}</span>
            <span className="block text-xs text-text-secondary">{choice.reason}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}
