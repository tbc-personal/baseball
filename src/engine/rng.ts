/**
 * Seeded, deterministic PRNG using mulberry32.
 * No Math.random() is used anywhere in this codebase.
 */

export interface Rng {
  /** Return next float in [0, 1) */
  next(): number
  /** Return current internal state for save/resume */
  state(): number
}

/**
 * Create a new RNG from a seed.
 * The seed can be an initial seed or a previously saved state.
 */
export function makeRng(seed: number): Rng {
  let state = seed | 0

  return {
    next(): number {
      let t = (state += 0x6d2b79f5)
      t = Math.imul(t ^ (t >>> 15), 1 | t)
      t ^= t + Math.imul(t ^ (t >>> 7), 61 | t)
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    },
    state(): number {
      return state
    }
  }
}

/** Wrapper for rng.next() if you prefer to be explicit */
export function rngFloat(rng: Rng): number {
  return rng.next()
}

/** Return true with probability p (where p is in [0, 1]) */
export function rngBool(rng: Rng, p: number): boolean {
  return rng.next() < p
}

/**
 * Weighted random pick from an array of [value, weight] pairs.
 * Weights need not sum to 1; they are normalized internally.
 */
export function rngPick<T>(
  rng: Rng,
  weighted: readonly [T, number][]
): T {
  if (weighted.length === 0) {
    throw new Error('Cannot pick from empty weighted array')
  }

  const totalWeight = weighted.reduce((sum, [, w]) => sum + w, 0)
  if (totalWeight <= 0) {
    throw new Error('Total weight must be positive')
  }

  let roll = rng.next() * totalWeight
  for (const [value, weight] of weighted) {
    roll -= weight
    if (roll < 0) {
      return value
    }
  }

  // Fallback to last item in case of floating-point rounding
  return weighted[weighted.length - 1][0]
}
