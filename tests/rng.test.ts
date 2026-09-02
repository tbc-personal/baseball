import { describe, it, expect } from 'vitest'
import { makeRng, rngBool, rngPick } from '../src/engine/rng'

describe('RNG', () => {
  it('same seed produces the same first 10 floats', () => {
    const rng1 = makeRng(12345)
    const sequence1 = Array.from({ length: 10 }, () => rng1.next())

    const rng2 = makeRng(12345)
    const sequence2 = Array.from({ length: 10 }, () => rng2.next())

    expect(sequence1).toEqual(sequence2)
  })

  it('different seeds diverge', () => {
    const rng1 = makeRng(12345)
    const sequence1 = Array.from({ length: 10 }, () => rng1.next())

    const rng2 = makeRng(54321)
    const sequence2 = Array.from({ length: 10 }, () => rng2.next())

    expect(sequence1).not.toEqual(sequence2)
  })

  it('all outputs are in [0, 1)', () => {
    const rng = makeRng(42)
    for (let i = 0; i < 1000; i++) {
      const val = rng.next()
      expect(val).toBeGreaterThanOrEqual(0)
      expect(val).toBeLessThan(1)
    }
  })

  it('saving state mid-sequence and resuming reproduces the remaining sequence', () => {
    const rng1 = makeRng(999)
    // Consume 5 values to advance the RNG
    Array.from({ length: 5 }, () => rng1.next())
    const savedState = rng1.state()
    const seq1Continued = Array.from({ length: 5 }, () => rng1.next())

    const rng2 = makeRng(savedState)
    const seq2Resumed = Array.from({ length: 5 }, () => rng2.next())

    expect(seq1Continued).toEqual(seq2Resumed)
  })

  it('rngBool(rng, 0) is always false', () => {
    const rng = makeRng(777)
    for (let i = 0; i < 100; i++) {
      expect(rngBool(rng, 0)).toBe(false)
    }
  })

  it('rngBool(rng, 1) is always true', () => {
    const rng = makeRng(888)
    for (let i = 0; i < 100; i++) {
      expect(rngBool(rng, 1)).toBe(true)
    }
  })

  it('rngBool respects probability', () => {
    const rng = makeRng(111)
    const p = 0.3
    const trials = 10000
    const successes = Array.from({ length: trials }, () =>
      rngBool(rng, p)
    ).filter(Boolean).length

    const observed = successes / trials
    // Allow ±0.5% tolerance
    expect(observed).toBeGreaterThan(p - 0.005)
    expect(observed).toBeLessThan(p + 0.005)
  })

  it('rngPick respects weights within tolerance over 100k draws', () => {
    const rng = makeRng(222)
    const items: [string, number][] = [
      ['a', 0.5],
      ['b', 0.3],
      ['c', 0.2]
    ]

    const counts = { a: 0, b: 0, c: 0 } as Record<string, number>
    for (let i = 0; i < 100000; i++) {
      const pick = rngPick(rng, items)
      counts[pick]++
    }

    const observed = {
      a: counts.a / 100000,
      b: counts.b / 100000,
      c: counts.c / 100000
    }

    // Allow ±0.5% tolerance
    expect(observed.a).toBeGreaterThan(0.5 - 0.005)
    expect(observed.a).toBeLessThan(0.5 + 0.005)
    expect(observed.b).toBeGreaterThan(0.3 - 0.005)
    expect(observed.b).toBeLessThan(0.3 + 0.005)
    expect(observed.c).toBeGreaterThan(0.2 - 0.005)
    expect(observed.c).toBeLessThan(0.2 + 0.005)
  })

  it('rngPick works with unnormalized weights', () => {
    const rng = makeRng(333)
    const items: [string, number][] = [
      ['high', 10],
      ['low', 1]
    ]

    const counts = { high: 0, low: 0 } as Record<string, number>
    for (let i = 0; i < 11000; i++) {
      const pick = rngPick(rng, items)
      counts[pick]++
    }

    // Should be roughly 10:1 ratio
    const ratio = counts.high / counts.low
    expect(ratio).toBeGreaterThan(8)
    expect(ratio).toBeLessThan(12)
  })
})
