import { describe, it, expect } from 'vitest'
import {
  advanceOnWalk,
  advanceOnHit,
  advanceOnOut,
  advanceOnBuntSacrifice,
  advanceOnBuntSingle
} from '../src/engine/bases'
import {
  BASE_RUNNING_R2_SCORES_ON_SINGLE,
  BASE_RUNNING_R1_THIRD_ON_SINGLE,
  BASE_RUNNING_R1_SCORES_ON_DOUBLE,
  BASE_RUNNING_DOUBLE_PLAY,
  BASE_RUNNING_SACRIFICE_FLY
} from '../src/engine/constants'
import { StubRng, EMPTY_BASES } from './fixtures'

const SUCCEED = 0 // for any p > 0, next() = 0 always beats it (rngBool: next() < p)
const FAIL = 0.999999 // for any p < 1, next() = ~1 always fails it

describe('advanceOnWalk', () => {
  it('empty bases: batter to first, nobody else moves', () => {
    const { bases, runsScored } = advanceOnWalk(EMPTY_BASES, 'batter')
    expect(bases).toEqual({ first: 'batter', second: null, third: null })
    expect(runsScored).toEqual([])
  })

  it('runner on second only: not forced, does not advance', () => {
    const bases = { first: null, second: 'r2', third: null }
    const result = advanceOnWalk(bases, 'batter')
    expect(result.bases).toEqual({ first: 'batter', second: 'r2', third: null })
    expect(result.runsScored).toEqual([])
  })

  it('runner on first only: forced to second', () => {
    const bases = { first: 'r1', second: null, third: null }
    const result = advanceOnWalk(bases, 'batter')
    expect(result.bases).toEqual({ first: 'batter', second: 'r1', third: null })
    expect(result.runsScored).toEqual([])
  })

  it('first and third occupied, second open: first forced to second, third holds (not forced)', () => {
    const bases = { first: 'r1', second: null, third: 'r3' }
    const result = advanceOnWalk(bases, 'batter')
    expect(result.bases).toEqual({ first: 'batter', second: 'r1', third: 'r3' })
    expect(result.runsScored).toEqual([])
  })

  it('bases loaded: forces a run, everyone shifts up', () => {
    const bases = { first: 'r1', second: 'r2', third: 'r3' }
    const result = advanceOnWalk(bases, 'batter')
    expect(result.bases).toEqual({ first: 'batter', second: 'r1', third: 'r2' })
    expect(result.runsScored).toEqual(['r3'])
  })
})

describe('advanceOnHit: single', () => {
  it('runners on 1st and 3rd: R3 scores, R1-to-third roll failing leaves R1 on second', () => {
    const bases = { first: 'r1', second: null, third: 'r3' }
    const rng = new StubRng([FAIL])
    const result = advanceOnHit(bases, 'batter', 'single', rng)
    expect(result.bases).toEqual({ first: 'batter', second: 'r1', third: null })
    expect(result.runsScored).toEqual(['r3'])
  })

  it('runners on 1st and 3rd: R1-to-third roll succeeding sends R1 to third', () => {
    const bases = { first: 'r1', second: null, third: 'r3' }
    const rng = new StubRng([SUCCEED])
    const result = advanceOnHit(bases, 'batter', 'single', rng)
    expect(result.bases).toEqual({ first: 'batter', second: null, third: 'r1' })
    expect(result.runsScored).toEqual(['r3'])
  })

  it('R2 scoring roll succeeding: R2 scores, third is then open for R1', () => {
    const bases = { first: 'r1', second: 'r2', third: null }
    // roll 1: R2 scores (succeed); roll 2: R1-to-third (succeed, since third now open)
    const rng = new StubRng([SUCCEED, SUCCEED])
    const result = advanceOnHit(bases, 'batter', 'single', rng)
    expect(result.runsScored).toEqual(['r2'])
    expect(result.bases).toEqual({ first: 'batter', second: null, third: 'r1' })
  })

  it('R2 scoring roll failing: R2 to third, so third is NOT open for R1 (no roll, straight to second)', () => {
    const bases = { first: 'r1', second: 'r2', third: null }
    const rng = new StubRng([FAIL]) // only one roll consumed: R1 never rolls since third isn't open
    const result = advanceOnHit(bases, 'batter', 'single', rng)
    expect(result.runsScored).toEqual([])
    expect(result.bases).toEqual({ first: 'batter', second: 'r1', third: 'r2' })
  })

  it('bases empty: batter to first only, no rolls consumed', () => {
    const rng = new StubRng([])
    const result = advanceOnHit(EMPTY_BASES, 'batter', 'single', rng)
    expect(result.bases).toEqual({ first: 'batter', second: null, third: null })
    expect(result.runsScored).toEqual([])
  })
})

describe('advanceOnHit: double', () => {
  it('R3 and R2 score; no runner on first means the R1 roll is irrelevant/unused', () => {
    const bases = { first: null, second: 'r2', third: 'r3' }
    const rng = new StubRng([]) // no rolls consumed
    const result = advanceOnHit(bases, 'batter', 'double', rng)
    expect(result.runsScored).toEqual(['r3', 'r2'])
    expect(result.bases).toEqual({ first: null, second: 'batter', third: null })
  })

  it('R1 scores with its roll succeeding', () => {
    const bases = { first: 'r1', second: null, third: null }
    const rng = new StubRng([SUCCEED])
    const result = advanceOnHit(bases, 'batter', 'double', rng)
    expect(result.runsScored).toEqual(['r1'])
    expect(result.bases).toEqual({ first: null, second: 'batter', third: null })
  })

  it('R1 held to third when its roll fails', () => {
    const bases = { first: 'r1', second: null, third: null }
    const rng = new StubRng([FAIL])
    const result = advanceOnHit(bases, 'batter', 'double', rng)
    expect(result.runsScored).toEqual([])
    expect(result.bases).toEqual({ first: null, second: 'batter', third: 'r1' })
  })
})

describe('advanceOnHit: triple', () => {
  it('everyone on base scores, batter to third', () => {
    const bases = { first: 'r1', second: 'r2', third: 'r3' }
    const result = advanceOnHit(bases, 'batter', 'triple', new StubRng([]))
    expect(result.runsScored).toEqual(['r3', 'r2', 'r1'])
    expect(result.bases).toEqual({ first: null, second: null, third: 'batter' })
  })
})

describe('advanceOnHit: hr', () => {
  it('bases loaded home run scores 4, bases empty after', () => {
    const bases = { first: 'r1', second: 'r2', third: 'r3' }
    const result = advanceOnHit(bases, 'batter', 'hr', new StubRng([]))
    expect(result.runsScored).toEqual(['r3', 'r2', 'r1', 'batter'])
    expect(result.runsScored).toHaveLength(4)
    expect(result.bases).toEqual({ first: null, second: null, third: null })
  })

  it('solo home run with empty bases scores just the batter', () => {
    const result = advanceOnHit(EMPTY_BASES, 'batter', 'hr', new StubRng([]))
    expect(result.runsScored).toEqual(['batter'])
  })
})

describe('advanceOnOut', () => {
  it('runner on 1st, 0 outs, DP roll succeeds: 2 outs, bases empty, no runs', () => {
    const bases = { first: 'r1', second: null, third: null }
    const rng = new StubRng([SUCCEED])
    const result = advanceOnOut(bases, 0, rng)
    expect(result.kind).toBe('double-play')
    expect(result.outsAdded).toBe(2)
    expect(result.runsScored).toEqual([])
    expect(result.bases).toEqual({ first: null, second: null, third: null })
  })

  it('runner on 1st, 0 outs, DP roll fails: runners hold, 1 out', () => {
    const bases = { first: 'r1', second: null, third: null }
    const rng = new StubRng([FAIL])
    const result = advanceOnOut(bases, 0, rng)
    expect(result.kind).toBe('plain')
    expect(result.outsAdded).toBe(1)
    expect(result.bases).toEqual(bases)
  })

  it('a double play that records the third out scores no run even with a runner on third', () => {
    const bases = { first: 'r1', second: null, third: 'r3' }
    const rng = new StubRng([SUCCEED]) // DP succeeds; sac-fly branch never rolled
    const result = advanceOnOut(bases, 1, rng) // 1 out already -> DP makes it the 3rd out
    expect(result.kind).toBe('double-play')
    expect(result.outsAdded).toBe(2)
    expect(result.runsScored).toEqual([])
    expect(result.bases.third).toBe('r3') // runner on third is left stranded, not scored
  })

  it('runner on 3rd only, 0 outs, no DP possible (no R1): sac fly roll succeeds, R3 scores', () => {
    const bases = { first: null, second: null, third: 'r3' }
    const rng = new StubRng([SUCCEED])
    const result = advanceOnOut(bases, 0, rng)
    expect(result.kind).toBe('sacrifice-fly')
    expect(result.outsAdded).toBe(1)
    expect(result.runsScored).toEqual(['r3'])
    expect(result.bases.third).toBeNull()
  })

  it('runner on 1st and 3rd, DP roll fails then sac fly roll succeeds: R3 scores, R1 holds, 1 out', () => {
    const bases = { first: 'r1', second: null, third: 'r3' }
    const rng = new StubRng([FAIL, SUCCEED])
    const result = advanceOnOut(bases, 0, rng)
    expect(result.kind).toBe('sacrifice-fly')
    expect(result.outsAdded).toBe(1)
    expect(result.runsScored).toEqual(['r3'])
    expect(result.bases).toEqual({ first: 'r1', second: null, third: null })
  })

  it('2 outs already: no DP, no sac fly regardless of runners; plain out', () => {
    const bases = { first: 'r1', second: null, third: 'r3' }
    const rng = new StubRng([]) // no rolls consumed at all: both are gated on outs < 2
    const result = advanceOnOut(bases, 2, rng)
    expect(result.kind).toBe('plain')
    expect(result.outsAdded).toBe(1)
    expect(result.runsScored).toEqual([])
    expect(result.bases).toEqual(bases)
  })

  it('rolls use the documented probabilities', () => {
    expect(BASE_RUNNING_DOUBLE_PLAY).toBeGreaterThan(0)
    expect(BASE_RUNNING_SACRIFICE_FLY).toBeGreaterThan(0)
  })
})

describe('bunt advances (section 3.6)', () => {
  it('sacrifice: batter out, all runners advance one base', () => {
    const bases = { first: 'r1', second: 'r2', third: 'r3' }
    const result = advanceOnBuntSacrifice(bases)
    expect(result.runsScored).toEqual(['r3'])
    expect(result.bases).toEqual({ first: null, second: 'r1', third: 'r2' })
  })

  it('sacrifice with runner on first only: forced to second, batter not on base', () => {
    const bases = { first: 'r1', second: null, third: null }
    const result = advanceOnBuntSacrifice(bases)
    expect(result.runsScored).toEqual([])
    expect(result.bases).toEqual({ first: null, second: 'r1', third: null })
  })

  it('bunt single: batter safe at first, runners advance one base', () => {
    const bases = { first: 'r1', second: 'r2', third: 'r3' }
    const result = advanceOnBuntSingle(bases, 'batter')
    expect(result.runsScored).toEqual(['r3'])
    expect(result.bases).toEqual({ first: 'batter', second: 'r1', third: 'r2' })
  })
})

describe('single advancement uses the documented probability constants', () => {
  it('single-value sanity check: probability constants are within (0,1)', () => {
    expect(BASE_RUNNING_R2_SCORES_ON_SINGLE).toBeGreaterThan(0)
    expect(BASE_RUNNING_R2_SCORES_ON_SINGLE).toBeLessThan(1)
    expect(BASE_RUNNING_R1_THIRD_ON_SINGLE).toBeGreaterThan(0)
    expect(BASE_RUNNING_R1_THIRD_ON_SINGLE).toBeLessThan(1)
    expect(BASE_RUNNING_R1_SCORES_ON_DOUBLE).toBeGreaterThan(0)
    expect(BASE_RUNNING_R1_SCORES_ON_DOUBLE).toBeLessThan(1)
  })
})
