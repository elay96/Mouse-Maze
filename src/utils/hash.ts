// Simple stable hash utility (no external libs)

export function stableHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  // Convert to positive hex string
  return Math.abs(hash).toString(16).padStart(8, '0');
}

// Seeded RNG for deterministic generation
export class SeededRandom {
  private seed: number;

  constructor(seedStr: string) {
    // Convert string to numeric seed
    this.seed = 0;
    for (let i = 0; i < seedStr.length; i++) {
      this.seed = ((this.seed << 5) - this.seed) + seedStr.charCodeAt(i);
      this.seed = this.seed & this.seed;
    }
    this.seed = Math.abs(this.seed) || 1;
  }

  // Returns 0-1
  next(): number {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }

  // Returns integer in [min, max] inclusive
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  // Returns float in [min, max)
  nextFloat(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }
}

