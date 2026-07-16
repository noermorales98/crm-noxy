export interface CellCoordinate {
  x: number;
  y: number;
}

export function shuffleIndices(length: number, random: () => number = Math.random): number[] {
  const indices = Array.from({ length }, (_, index) => index);
  for (let index = indices.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [indices[index], indices[swapIndex]] = [indices[swapIndex], indices[index]];
  }
  return indices;
}

export function edgeNoise(x: number, y: number, time: number): boolean {
  return (Math.sin(x * 12.9898 + y * 78.233 + time * 0.002) + 1) * 0.5 > 0.45;
}

export function organicRadius(angle: number, time: number, noise: number): number {
  const modulation =
    Math.sin(angle * 3 + time * 0.0011) * 0.55
    + Math.sin(angle * 5 - time * 0.0017 + 1.3) * 0.30
    + Math.sin(angle * 2 + time * 0.0007 + 2.1) * 0.20;
  return modulation * (0.95 + noise * 0.30);
}

export function isInsideHoverBlob(
  cellX: number,
  cellY: number,
  pointerX: number,
  pointerY: number,
  time: number,
  noise: number,
): boolean {
  const dx = cellX - pointerX;
  const dy = cellY - pointerY;
  const distance = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx);
  const rMax = 4 + organicRadius(angle, time, noise);
  if (distance <= rMax - 0.5) return true;
  return distance <= rMax + 0.4 && edgeNoise(cellX, cellY, time);
}
