import type { ReactNode } from "react";

type DataListProps<T> = {
  rows: T[];
  renderRow: (row: T) => ReactNode;
  /** Obligatorio: toda lista explica cómo llenarse cuando está vacía. */
  empty: ReactNode;
  getKey: (row: T) => string;
  label?: string;
};

export function DataList<T>({ rows, renderRow, empty, getKey, label }: DataListProps<T>) {
  if (rows.length === 0) return <>{empty}</>;
  return (
    <ul aria-label={label} className="divide-y divide-line">
      {rows.map((row) => (
        <li key={getKey(row)} className="flex min-h-12 min-w-0 items-center gap-3 px-3.5 py-1.5 sm:min-h-14 sm:px-5 sm:py-2">
          {renderRow(row)}
        </li>
      ))}
    </ul>
  );
}
