export const REMINDER_DAYS_OPTIONS = [
  { value: 0, label: "El mismo día" },
  { value: 1, label: "1 día antes" },
  { value: 2, label: "2 días antes" },
  { value: 3, label: "3 días antes" },
  { value: 5, label: "5 días antes" },
  { value: 7, label: "7 días antes" },
] as const;

export function parseReminderDaysBefore(value: unknown, fallback = 1): number {
  let n = fallback;
  if (typeof value === "number" && Number.isFinite(value)) {
    n = Math.floor(value);
  } else if (typeof value === "string" && value.trim() !== "") {
    const parsed = parseInt(value, 10);
    if (!Number.isNaN(parsed)) n = parsed;
  }
  return Math.max(0, Math.min(30, n));
}

export function reminderDaysLabel(days: number): string {
  const match = REMINDER_DAYS_OPTIONS.find((option) => option.value === days);
  if (match) return match.label;
  if (days <= 0) return "El mismo día";
  if (days === 1) return "1 día antes";
  return `${days} días antes`;
}

export function reminderDaysSelectOptions(current: number) {
  if (REMINDER_DAYS_OPTIONS.some((option) => option.value === current)) {
    return [...REMINDER_DAYS_OPTIONS];
  }
  return [...REMINDER_DAYS_OPTIONS, { value: current, label: reminderDaysLabel(current) }];
}
