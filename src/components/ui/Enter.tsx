import type { CSSProperties, ReactNode } from "react";
import { cn } from "./cn";

type EnterProps = {
  /** Orden del bloque en la pantalla (0-5); el retraso es índice × --stagger. */
  index: number;
  children: ReactNode;
  className?: string;
};

/** Entrada escalonada al montar la pantalla. Solo en contenedores que se montan una vez. */
export function Enter({ index, children, className }: EnterProps) {
  const safe = Number.isFinite(index) ? Math.trunc(index) : 0;
  const i = Math.min(5, Math.max(0, safe));
  return (
    <div className={cn("crm-enter", className)} style={{ "--i": i } as CSSProperties}>
      {children}
    </div>
  );
}
