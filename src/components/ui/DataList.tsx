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
        <li key={getKey(row)} className="flex min-h-14 min-w-0 items-center gap-3 px-4 py-2 sm:px-5">
          {renderRow(row)}
        </li>
      ))}
    </ul>
  );
}
