// Detecta de qué marcas o clientes de contenido se habla en un mensaje. Funciones puras (sin base de datos).

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export type BrandRef = { id: string; name: string };

/**
 * Marcas cuyo nombre aparece completo en el mensaje (sin acentos ni mayúsculas, como palabra entera). Las de nombre más largo
 * van primero —«Café Luna» gana a «Luna»— y no se repite una marca contenida en otra ya elegida. Tope de `max`.
 */
export function matchBrands(message: string, brands: BrandRef[], max = 2): BrandRef[] {
  const text = norm(message);
  const found = brands
    .filter((b) => norm(b.name).trim().length >= 3)
    .sort((a, b) => b.name.length - a.name.length)
    .filter((b) => new RegExp(`(^|[^a-z0-9])${escapeRegExp(norm(b.name).trim())}($|[^a-z0-9])`).test(text));
  const out: BrandRef[] = [];
  for (const b of found) {
    if (out.some((o) => norm(o.name).includes(norm(b.name)))) continue;
    out.push(b);
    if (out.length >= max) break;
  }
  return out;
}

/** Bloque de texto con la voz de una marca; si no tiene, dice que no está definida para que la IA lo avise en vez de inventarla. */
export function brandVoiceBlock(name: string, context: string | null | undefined, description: string | null | undefined): string {
  const voice = (context ?? "").trim();
  const lines = [`MARCA «${name}»`];
  if (description?.trim()) lines.push(`Descripción: ${description.trim()}`);
  lines.push(voice ? `Voz, audiencia y reglas (respétalas al redactar para esta marca):\n${voice.slice(0, 3000)}` : "Voz y contexto: sin definir. Si te piden redactar, avisa que no hay voz guardada y ofrece proponer una (acción edit_content_client_context).");
  return lines.join("\n");
}
