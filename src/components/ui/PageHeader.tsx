import type { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  /** Línea de contexto: dónde está la persona y las cifras clave. */
  subtitle?: ReactNode;
  /** Como máximo una acción primaria; el resto, secundarias. */
  actions?: ReactNode;
};

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <header className="flex flex-wrap items-end gap-x-6 gap-y-3 pb-5">
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl font-semibold leading-tight tracking-[-0.02em] text-text-primary">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-text-secondary">{subtitle}</p>}
      </div>
      {actions && (
        <div className="flex w-full flex-wrap gap-2 sm:w-auto [&>*]:flex-1 sm:[&>*]:flex-none">{actions}</div>
      )}
    </header>
  );
}
