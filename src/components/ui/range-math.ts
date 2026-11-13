// Cálculo del control de rango propio (RangeBar): sin DOM, para poder probarlo.

/** Valor dentro de [min, max], redondeado al paso más cercano. */
export function clampToStep(value: number, min: number, max: number, step: number): number {
  const stepped = Math.round((value - min) / step) * step + min;
  return Math.min(max, Math.max(min, stepped));
}

/** Valor que corresponde a una posición horizontal del puntero sobre la pista. */
export function valueFromPosition(clientX: number, track: { left: number; width: number }, min: number, max: number, step: number): number {
  if (track.width <= 0) return min;
  const ratio = Math.min(1, Math.max(0, (clientX - track.left) / track.width));
  return clampToStep(min + ratio * (max - min), min, max, step);
}

/** Nuevo valor para una tecla del teclado, o `null` si la tecla no mueve el control. */
export function keyboardValue(key: string, value: number, min: number, max: number, step: number): number | null {
  const big = step * 2;
  switch (key) {
    case "ArrowRight":
    case "ArrowUp":
      return clampToStep(value + step, min, max, step);
    case "ArrowLeft":
    case "ArrowDown":
      return clampToStep(value - step, min, max, step);
    case "PageUp":
      return clampToStep(value + big, min, max, step);
    case "PageDown":
      return clampToStep(value - big, min, max, step);
    case "Home":
      return min;
    case "End":
      return max;
    default:
      return null;
  }
}
