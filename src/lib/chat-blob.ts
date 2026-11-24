import { blobatar } from "blobatar";

/** Semilla de la criatura de un chat guardado: la que se recordó al crearlo o, si no hay, su propio id (siempre la misma). */
export function chatBlobSeed(conversationId: string): string {
  try {
    return localStorage.getItem(`assistant-blob-${conversationId}`) || conversationId;
  } catch {
    return conversationId;
  }
}

/** Colores de la criatura (cabeza y ojos), leídos de su propio dibujo para que el chat se pinte igual que ella. */
export function blobColors(seed: string): { accent: string; ink: string } {
  const fills = String(blobatar(seed, {})).match(/fill="(#[0-9a-fA-F]{6})"/g) ?? [];
  const hex = (f: string | undefined, fallback: string) => f?.match(/#[0-9a-fA-F]{6}/)?.[0] ?? fallback;
  return { accent: hex(fills[0], "#007AFF"), ink: hex(fills[1], "#1D1D1F") };
}
