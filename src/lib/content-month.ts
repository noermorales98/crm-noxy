export function parseMesParam(value: string | null): { year: number; month: number } | null {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) return null;
  const [year, month] = value.split("-").map(Number);
  if (month < 1 || month > 12) return null;
  return { year, month: month - 1 };
}

export function formatMesParam(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const next = month + delta;
  return { year: year + Math.floor(next / 12), month: ((next % 12) + 12) % 12 };
}

export function isCurrentMonth(year: number, month: number, date = new Date()): boolean {
  return year === date.getFullYear() && month === date.getMonth();
}
