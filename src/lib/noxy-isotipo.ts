/**
 * Isotipo de Noxy como logo de cotizaciones, con color editable.
 * En BD (QuoteSettings.logoUrl, VARCHAR(191)) solo se guarda un marcador corto:
 * `noxy-isotipo:#RRGGBB`. Quien necesita la imagen lo resuelve con `resolveLogoSrc`.
 * Módulo puro (sin alias ni dependencias) para usarlo en navegador, servidor y tests.
 */

export const NOXY_ISOTIPO_DEFAULT_COLOR = "#3545D6"; // el de public/Isotipo_Azul.svg
const PREFIX = "noxy-isotipo:";
const HEX = /^#[0-9a-fA-F]{6}$/;

// Mismo trazado que public/Isotipo_Azul.svg
const PATH =
  "M417.486,3600L417.486,3536.227L452.164,3536.227C452.924,3536.227 453.652,3535.925 454.189,3535.388C454.725,3534.85 455.027,3534.121 455.027,3533.361C455.027,3523.004 455.027,3487.573 455.027,3477.223C455.027,3475.642 456.306,3474.36 457.885,3474.358C470.746,3474.335 522.636,3474.244 522.636,3474.244L584.992,3536.227L584.992,3600L547.685,3600C546.927,3600 546.2,3599.699 545.663,3599.164C539.462,3592.973 500.557,3554.136 486.712,3540.315C485.893,3539.497 484.663,3539.253 483.594,3539.697C482.525,3540.141 481.828,3541.185 481.828,3542.344C481.828,3556.339 481.828,3587.537 481.828,3597.135C481.829,3598.717 480.547,3600 478.966,3600C466.49,3600 417.486,3600 417.486,3600";

export function isValidHexColor(value: string): boolean {
  return HEX.test(value);
}

/** Marcador que se guarda en logoUrl. Un color inválido cae al color por defecto. */
export function noxyIsotipoMarker(color: string = NOXY_ISOTIPO_DEFAULT_COLOR): string {
  return `${PREFIX}${isValidHexColor(color) ? color.toUpperCase() : NOXY_ISOTIPO_DEFAULT_COLOR}`;
}

/** Color del isotipo si logoUrl es el marcador; null si es un logo personalizado o está vacío. */
export function parseNoxyIsotipoColor(logoUrl: string | null | undefined): string | null {
  if (!logoUrl || !logoUrl.startsWith(PREFIX)) return null;
  const color = logoUrl.slice(PREFIX.length);
  return isValidHexColor(color) ? color.toUpperCase() : NOXY_ISOTIPO_DEFAULT_COLOR;
}

export function noxyIsotipoSvg(color: string = NOXY_ISOTIPO_DEFAULT_COLOR): string {
  const fill = isValidHexColor(color) ? color : NOXY_ISOTIPO_DEFAULT_COLOR;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="264" height="198" viewBox="0 0 264 198"><g transform="matrix(1,0,0,1,-6922.141318,-1330.385135)"><g transform="matrix(1.572009,0,0,1.570418,6265.849075,-4125.62983)"><path d="${PATH}" fill="${fill}"/></g></g></svg>`;
}

export function noxyIsotipoDataUri(color: string = NOXY_ISOTIPO_DEFAULT_COLOR): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(noxyIsotipoSvg(color))}`;
}

/** Valor listo para `<img src>` / fetch: el isotipo como data URI si es el marcador; el resto, tal cual. */
export function resolveLogoSrc(logoUrl: string | null | undefined): string | null {
  if (!logoUrl) return null;
  const color = parseNoxyIsotipoColor(logoUrl);
  return color ? noxyIsotipoDataUri(color) : logoUrl;
}
