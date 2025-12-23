export function randRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function randInt(minInclusive: number, maxExclusive: number): number {
  return Math.floor(randRange(minInclusive, maxExclusive));
}

export function chance(p: number): boolean {
  return Math.random() < p;
}

export function pick<T>(items: readonly T[]): T {
  const idx = Math.floor(Math.random() * items.length);
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return items[idx]!;
}
