/** Paleta fija del calendario general. Cada hex se mapea a un colorId de Google Calendar. */
export const CLIENT_PALETTE = [
  { hex: "#3545D6", googleColorId: "9" },
  { hex: "#9B7EDE", googleColorId: "1" },
  { hex: "#6E7F5C", googleColorId: "2" },
  { hex: "#C9973B", googleColorId: "5" },
  { hex: "#4A7BA6", googleColorId: "7" },
  { hex: "#C45C26", googleColorId: "6" },
  { hex: "#8B3A4A", googleColorId: "11" },
  { hex: "#2F6F4E", googleColorId: "10" },
  { hex: "#6B4C9A", googleColorId: "3" },
  { hex: "#D4537E", googleColorId: "4" },
  { hex: "#5C6370", googleColorId: "8" },
] as const;

export const DEFAULT_CLIENT_COLOR = CLIENT_PALETTE[0].hex;

const GOOGLE_COLOR_HEX: Record<string, string> = {
  "1": "#a4bdfc",
  "2": "#7ae7bf",
  "3": "#dbadff",
  "4": "#ff887c",
  "5": "#fbd75b",
  "6": "#ffb878",
  "7": "#46d6db",
  "8": "#e1e1e1",
  "9": "#5484ed",
  "10": "#51b749",
  "11": "#dc2127",
};

export function nextClientColor(existingCount: number): string {
  const index = ((existingCount % CLIENT_PALETTE.length) + CLIENT_PALETTE.length) % CLIENT_PALETTE.length;
  return CLIENT_PALETTE[index].hex;
}

export function isPaletteColor(value: unknown): value is string {
  return typeof value === "string" && CLIENT_PALETTE.some((entry) => entry.hex.toLowerCase() === value.toLowerCase());
}

export function normalizePaletteColor(value: string): string {
  const match = CLIENT_PALETTE.find((entry) => entry.hex.toLowerCase() === value.toLowerCase());
  return match?.hex ?? DEFAULT_CLIENT_COLOR;
}

function hexToRgb(hex: string): [number, number, number] | null {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return null;
  const raw = match[1];
  return [parseInt(raw.slice(0, 2), 16), parseInt(raw.slice(2, 4), 16), parseInt(raw.slice(4, 6), 16)];
}

/** colorId de Google (1–11) más cercano al hex del cliente. */
export function googleColorIdForHex(hex: string): string {
  const mapped = CLIENT_PALETTE.find((entry) => entry.hex.toLowerCase() === hex.toLowerCase());
  if (mapped) return mapped.googleColorId;

  const rgb = hexToRgb(hex);
  if (!rgb) return CLIENT_PALETTE[0].googleColorId;

  let bestId = "9";
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const [id, googleHex] of Object.entries(GOOGLE_COLOR_HEX)) {
    const target = hexToRgb(googleHex);
    if (!target) continue;
    const distance = (rgb[0] - target[0]) ** 2 + (rgb[1] - target[1]) ** 2 + (rgb[2] - target[2]) ** 2;
    if (distance < bestDistance) {
      bestDistance = distance;
      bestId = id;
    }
  }
  return bestId;
}

const TYPE_LABELS: Record<string, string> = {
  video: "Video",
  reel: "Reel",
  flyer: "Flyer",
  historia: "Historia",
  entrega: "Entrega / grabación",
  edicion: "En edición",
};

export type ContentEventInput = {
  id: string;
  date: Date;
  type: string;
  title: string;
  time: string | null;
  hook: string | null;
  caption: string | null;
  clientId: string;
  clientName: string;
  clientColor: string;
  timeZone: string;
  crmUrl: string | null;
};

export function parseContentClock(raw: string | null | undefined): { hours: number; minutes: number } | null {
  if (!raw) return null;
  const text = raw.trim().toLowerCase().replace(/\./g, "");
  const match = text.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = match[2] ? Number(match[2]) : 0;
  const meridiem = match[3];
  if (!Number.isFinite(hours) || !Number.isFinite(minutes) || minutes > 59 || hours > 23) return null;

  if (meridiem) {
    if (hours < 1 || hours > 12) return null;
    if (meridiem === "pm" && hours < 12) hours += 12;
    if (meridiem === "am" && hours === 12) hours = 0;
  }

  return { hours, minutes };
}

export function utcDateKey(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function nextDateKey(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  return utcDateKey(new Date(Date.UTC(year, month - 1, day + 1)));
}

function wallOffsetMs(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? "0");
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour") % 24, get("minute"), get("second"));
  return asUtc - instant.getTime();
}

export function zonedWallTimeToUtc(dateKey: string, hours: number, minutes: number, timeZone: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0));
  const offset = wallOffsetMs(utcGuess, timeZone);
  const corrected = new Date(utcGuess.getTime() - offset);
  const offsetAfter = wallOffsetMs(corrected, timeZone);
  if (offsetAfter !== offset) return new Date(utcGuess.getTime() - offsetAfter);
  return corrected;
}

export function contentTypeLabel(type: string): string {
  return TYPE_LABELS[type] ?? type;
}

export function buildContentEventBody(item: ContentEventInput) {
  const dateKey = utcDateKey(item.date);
  const clock = parseContentClock(item.time);
  const summary = `${item.clientName} — ${item.title}`.slice(0, 1024);
  const lines = [
    `Cliente: ${item.clientName}`,
    `Tipo: ${contentTypeLabel(item.type)}`,
  ];
  if (item.hook?.trim()) lines.push("", "Hook:", item.hook.trim());
  if (item.caption?.trim()) lines.push("", "Texto:", item.caption.trim());
  if (item.crmUrl) lines.push("", `Abrir en el CRM: ${item.crmUrl}`);

  const when = clock
    ? (() => {
        const start = zonedWallTimeToUtc(dateKey, clock.hours, clock.minutes, item.timeZone);
        const end = new Date(start.getTime() + 60 * 60 * 1000);
        return {
          start: { dateTime: start.toISOString(), timeZone: item.timeZone },
          end: { dateTime: end.toISOString(), timeZone: item.timeZone },
        };
      })()
    : {
        start: { date: dateKey },
        end: { date: nextDateKey(dateKey) },
      };

  return {
    summary,
    description: lines.join("\n").slice(0, 8000),
    colorId: googleColorIdForHex(item.clientColor),
    ...when,
    extendedProperties: {
      private: {
        crmContentItemId: item.id,
        crmClientId: item.clientId,
      },
    },
    reminders: { useDefault: true },
  };
}

