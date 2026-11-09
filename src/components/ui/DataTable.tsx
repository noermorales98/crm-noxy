import type { ReactNode } from "react";
import { cn } from "./cn";

export type DataColumn<T> = {
  key: string;
  header: string;
  align?: "left" | "right";
  render: (row: T) => ReactNode;
};

type DataTableProps<T> = {
  columns: DataColumn<T>[];
  rows: T[];
  /** Fila apilada para pantallas por debajo de 1024 px. */
  mobileRow: (row: T) => ReactNode;
  /** Obligatorio: toda tabla explica cómo llenarse cuando está vacía. */
  empty: ReactNode;
  getKey: (row: T) => string;
  label?: string;
};

/**
 * Renderiza la tabla (≥ 1024 px) y las filas apiladas (< 1024 px) a la vez; la copia oculta queda
 * fuera del árbol de accesibilidad. `render` y `mobileRow` deben ser puros y sin `id`, `name` ni
 * controles de formulario, para no duplicarlos en el DOM.
 */
export function DataTable<T>({ columns, rows, mobileRow, empty, getKey, label }: DataTableProps<T>) {
  if (rows.length === 0) return <>{empty}</>;
  return (
    <>
      {/* Desplazamiento propio: un valor largo nunca recorta la última columna (Acciones). */}
      <div className="hidden lg:block min-w-0 overflow-x-auto">
        <table className="w-full border-separate border-spacing-0 text-sm">
          {label && <caption className="sr-only">{label}</caption>}
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={cn(
                    "whitespace-nowrap border-b border-line px-4 py-2 text-xs font-medium text-text-secondary",
                    column.align === "right" ? "text-right" : "text-left",
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={getKey(row)} className="group/row">
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      "border-b border-line px-4 py-2 align-middle group-last/row:border-b-0",
                      column.align === "right" && "text-right tabular-nums",
                    )}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul aria-label={label} className="divide-y divide-line lg:hidden">
        {rows.map((row) => (
          <li key={getKey(row)} className="flex min-h-14 min-w-0 items-center gap-3 px-4 py-1.5">
            {mobileRow(row)}
          </li>
        ))}
      </ul>
    </>
  );
}
