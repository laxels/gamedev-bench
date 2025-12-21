export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function randFloat(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function randInt(minInclusive: number, maxInclusive: number): number {
  return Math.floor(randFloat(minInclusive, maxInclusive + 1));
}

export function easeOutCubic(t: number): number {
  const clamped = clamp(t, 0, 1);
  return 1 - (1 - clamped) ** 3;
}
