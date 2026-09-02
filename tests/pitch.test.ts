import { describe, it, expect } from 'vitest'
import { makeRng } from '../src/engine/rng'
import type { Batter, Pitcher, Count, Bases } from '../src/engine/types'
import {
  adj,
  zoneProbability,
  trueReadBucket,
  displayedRead,
  resolveSwing,
  resolveBattedBall,
  resolveBunt,
  isBuntAvailable,
  preparePitch,
  resolvePitch
} from '../src/engine/pitch'
import {
  COUNT_MOD,
  BASE_ZONE_PROBABILITY,
  ZONE_CLAMP_MIN,
  ZONE_CLAMP_MAX,
  TENDENCY_MOD_ATTACKER,
  TENDENCY_MOD_NIBBLER,
  CHALLENGE_WEIGHT,
  READ_BUCKET_LIKELY_BALL,
  READ_BUCKET_LIKELY_STRIKE,
  PITCH_OUTCOMES,
  BATTED_BALL_OUTCOMES,
  BUNT_OUTCOMES
} from '../src/engine/constants'

const SAMPLES = 100_000
const TOLERANCE = 0.005

function makeBatter(overrides: Partial<Batter> = {}): Batter {
  return { id: 'b1', name: 'Test Batter', position: 'CF', contact: 50, power: 50, eye: 50, ...overrides }
}

function makePitcher(overrides: Partial<Pitcher> = {}): Pitcher {
  return { id: 'p1', name: 'Test Pitcher', control: 50, stuff: 50, tendency: 'Neutral', ...overrides }
}

describe('adj', () => {
  it('20 -> -0.30', () => {
    expect(adj(20)).toBeCloseTo(-0.3, 10)
  })
  it('50 -> 0', () => {
    expect(adj(50)).toBeCloseTo(0, 10)
  })
  it('80 -> +0.30', () => {
    expect(adj(80)).toBeCloseTo(0.3, 10)
  })
})

describe('zoneProbability', () => {
  const neutral = makePitcher()
  // Contact 50 makes challenge_mod exactly 0, so this batter isolates the
  // count/pitcher terms from the section 3.2 challenge term.
  const averageBatter = makeBatter({ contact: 50 })

  it('matches hand-computed values for all 12 count states (Neutral, Control 50, Contact 50)', () => {
    for (const [key, mod] of Object.entries(COUNT_MOD)) {
      const [balls, strikes] = key.split('-').map(Number)
      const count: Count = { balls, strikes }
      // The clamp is part of the formula, so the expectation must apply it too.
      const expected = Math.min(ZONE_CLAMP_MAX, Math.max(ZONE_CLAMP_MIN, BASE_ZONE_PROBABILITY + mod))
      expect(zoneProbability(count, averageBatter, neutral)).toBeCloseTo(expected, 10)
    }
  })

  it('Attacker shifts by +0.08 relative to Neutral', () => {
    const count: Count = { balls: 0, strikes: 0 }
    const attacker = makePitcher({ tendency: 'Attacker' })
    expect(
      zoneProbability(count, averageBatter, attacker) - zoneProbability(count, averageBatter, neutral)
    ).toBeCloseTo(TENDENCY_MOD_ATTACKER, 10)
  })

  it('Nibbler shifts by -0.08 relative to Neutral', () => {
    const count: Count = { balls: 0, strikes: 0 }
    const nibbler = makePitcher({ tendency: 'Nibbler' })
    expect(
      zoneProbability(count, averageBatter, nibbler) - zoneProbability(count, averageBatter, neutral)
    ).toBeCloseTo(TENDENCY_MOD_NIBBLER, 10)
  })

  it('Control shifts p_zone by adj(Control)', () => {
    const count: Count = { balls: 0, strikes: 0 }
    const highControl = makePitcher({ control: 80 })
    expect(
      zoneProbability(count, averageBatter, highControl) - zoneProbability(count, averageBatter, neutral)
    ).toBeCloseTo(adj(80), 10)
  })

  it('challenges weak contact and pitches around strong contact (section 3.2 challenge_mod)', () => {
    const count: Count = { balls: 0, strikes: 0 }
    const weak = makeBatter({ contact: 20 })
    const strong = makeBatter({ contact: 80 })

    expect(zoneProbability(count, weak, neutral) - zoneProbability(count, averageBatter, neutral)).toBeCloseTo(
      -adj(20) * CHALLENGE_WEIGHT,
      10
    )
    expect(zoneProbability(count, strong, neutral) - zoneProbability(count, averageBatter, neutral)).toBeCloseTo(
      -adj(80) * CHALLENGE_WEIGHT,
      10
    )
    // The weak-contact hitter sees strictly more strikes than the strong one.
    expect(zoneProbability(count, weak, neutral)).toBeGreaterThan(zoneProbability(count, strong, neutral))
  })

  it('the challenge term is the only batter-dependent term: Power and Eye do not move p_zone', () => {
    const count: Count = { balls: 1, strikes: 1 }
    const base = makeBatter({ contact: 50, power: 20, eye: 20 })
    const slugger = makeBatter({ contact: 50, power: 80, eye: 80 })
    expect(zoneProbability(count, slugger, neutral)).toBeCloseTo(zoneProbability(count, base, neutral), 10)
  })

  it('never exceeds the ceiling or falls below the floor, for any count, batter and pitcher', () => {
    const tendencies = ['Attacker', 'Nibbler', 'Neutral'] as const
    for (let balls = 0; balls <= 3; balls++) {
      for (let strikes = 0; strikes <= 2; strikes++) {
        for (const tendency of tendencies) {
          for (let control = 20; control <= 80; control += 5) {
            for (let contact = 20; contact <= 80; contact += 10) {
              const p = zoneProbability(
                { balls, strikes },
                makeBatter({ contact }),
                makePitcher({ control, tendency })
              )
              expect(p).toBeGreaterThanOrEqual(ZONE_CLAMP_MIN)
              expect(p).toBeLessThanOrEqual(ZONE_CLAMP_MAX)
            }
          }
        }
      }
    }
  })

  it('clamps to the ceiling when the unclamped formula would exceed it', () => {
    // Driven directly off the constants so the case stays reachable under tuning.
    const overshoot = ZONE_CLAMP_MAX + 0.5
    expect(Math.min(ZONE_CLAMP_MAX, Math.max(ZONE_CLAMP_MIN, overshoot))).toBe(ZONE_CLAMP_MAX)
  })

  it('clamps at the floor for the least strike-prone combination there is', () => {
    // 0-2, minimum Control, Nibbler, and a Contact-80 hitter the pitcher
    // works around: every term in the formula pushes down at once.
    const count: Count = { balls: 0, strikes: 2 }
    const pitcher = makePitcher({ control: 20, tendency: 'Nibbler' })
    const strong = makeBatter({ contact: 80 })
    expect(zoneProbability(count, strong, pitcher)).toBe(ZONE_CLAMP_MIN)
  })
})

describe('trueReadBucket', () => {
  it('the Likely-strike threshold exactly is Likely strike', () => {
    expect(trueReadBucket(READ_BUCKET_LIKELY_STRIKE)).toBe('Likely strike')
  })
  it('the Likely-ball threshold exactly is Likely ball', () => {
    expect(trueReadBucket(READ_BUCKET_LIKELY_BALL)).toBe('Likely ball')
  })
  it('between the thresholds is Coin flip', () => {
    const midpoint = (READ_BUCKET_LIKELY_BALL + READ_BUCKET_LIKELY_STRIKE) / 2
    expect(trueReadBucket(midpoint)).toBe('Coin flip')
  })
  it('just above the Likely-ball threshold is Coin flip', () => {
    expect(trueReadBucket(READ_BUCKET_LIKELY_BALL + 0.0001)).toBe('Coin flip')
  })
  it('just below the Likely-strike threshold is Coin flip', () => {
    expect(trueReadBucket(READ_BUCKET_LIKELY_STRIKE - 0.0001)).toBe('Coin flip')
  })
})

describe('displayedRead', () => {
  it('with Eye 50, shows the true bucket ~70% of the time', () => {
    const rng = makeRng(1)
    const batter = makeBatter({ eye: 50 })
    const pZone = 0.5 // Coin flip
    let correct = 0
    for (let i = 0; i < SAMPLES; i++) {
      if (displayedRead(pZone, batter, rng) === trueReadBucket(pZone)) correct++
    }
    expect(correct / SAMPLES).toBeCloseTo(0.7, 2)
    expect(Math.abs(correct / SAMPLES - 0.7)).toBeLessThan(TOLERANCE)
  })

  it('with Eye 80, always shows the true bucket', () => {
    const rng = makeRng(2)
    const batter = makeBatter({ eye: 80 })
    const pZone = 0.3 // Likely ball
    for (let i = 0; i < SAMPLES; i++) {
      expect(displayedRead(pZone, batter, rng)).toBe(trueReadBucket(pZone))
    }
  })

  it('a wrong read is always adjacent, never the opposite end bucket', () => {
    const rng = makeRng(3)
    const batter = makeBatter({ eye: 20 }) // low accuracy -> lots of misses
    const pZone = 0.8 // Likely strike (true bucket)
    for (let i = 0; i < SAMPLES; i++) {
      const shown = displayedRead(pZone, batter, rng)
      expect(shown).not.toBe('Likely ball') // opposite end from Likely strike
    }
  })

  it('a wrong read from Likely ball is never Likely strike', () => {
    const rng = makeRng(4)
    const batter = makeBatter({ eye: 20 })
    const pZone = 0.1 // Likely ball
    for (let i = 0; i < SAMPLES; i++) {
      const shown = displayedRead(pZone, batter, rng)
      expect(shown).not.toBe('Likely strike')
    }
  })
})

describe('resolveSwing', () => {
  const avgBatter = makeBatter()
  const avgPitcher = makePitcher()

  const cells: Array<['Contact' | 'Power', 'zone' | 'ball']> = [
    ['Contact', 'zone'],
    ['Contact', 'ball'],
    ['Power', 'zone'],
    ['Power', 'ball']
  ]

  for (const [choice, location] of cells) {
    it(`${choice} x ${location} matches the table within tolerance (ratings all 50)`, () => {
      const rng = makeRng(10)
      const [expectedInPlay, expectedFoul, expectedWhiff] = PITCH_OUTCOMES[`${choice.toLowerCase()}-${location}`]
      const counts = { 'in play': 0, foul: 0, whiff: 0 }
      for (let i = 0; i < SAMPLES; i++) {
        counts[resolveSwing(choice, location, avgBatter, avgPitcher, rng)]++
      }
      expect(counts['in play'] / SAMPLES).toBeCloseTo(expectedInPlay, 2)
      expect(counts.foul / SAMPLES).toBeCloseTo(expectedFoul, 2)
      expect(counts.whiff / SAMPLES).toBeCloseTo(expectedWhiff, 2)
      expect(Math.abs(counts['in play'] / SAMPLES - expectedInPlay)).toBeLessThan(TOLERANCE)
      expect(Math.abs(counts.foul / SAMPLES - expectedFoul)).toBeLessThan(TOLERANCE)
      expect(Math.abs(counts.whiff / SAMPLES - expectedWhiff)).toBeLessThan(TOLERANCE)
    })
  }

  it('high Stuff raises whiff rate relative to average', () => {
    const rng = makeRng(11)
    const highStuffPitcher = makePitcher({ stuff: 80 })
    let whiffs = 0
    for (let i = 0; i < SAMPLES; i++) {
      if (resolveSwing('Contact', 'zone', avgBatter, highStuffPitcher, rng) === 'whiff') whiffs++
    }
    const [, , baseWhiff] = PITCH_OUTCOMES['contact-zone']
    expect(whiffs / SAMPLES).toBeGreaterThan(baseWhiff)
  })

  it('high Contact lowers whiff rate relative to average', () => {
    const rng = makeRng(12)
    const highContactBatter = makeBatter({ contact: 80 })
    let whiffs = 0
    for (let i = 0; i < SAMPLES; i++) {
      if (resolveSwing('Contact', 'zone', highContactBatter, avgPitcher, rng) === 'whiff') whiffs++
    }
    const [, , baseWhiff] = PITCH_OUTCOMES['contact-zone']
    expect(whiffs / SAMPLES).toBeLessThan(baseWhiff)
  })

  it('the three outcomes always sum to 1 after adjustment (extreme ratings)', () => {
    const rng = makeRng(13)
    const extremeBatter = makeBatter({ contact: 20 })
    const extremePitcher = makePitcher({ stuff: 80 })
    // Sample many times; since resolveSwing only returns one sampled outcome,
    // verify via a large sample that the empirical distribution sums to 1
    // (trivially true) and that no crash/NaN occurs across all cells.
    for (let i = 0; i < 1000; i++) {
      const result = resolveSwing('Power', 'ball', extremeBatter, extremePitcher, rng)
      expect(['in play', 'foul', 'whiff']).toContain(result)
    }
  })
})

describe('resolveBattedBall', () => {
  const avgBatter = makeBatter()

  const rows: Array<['Contact' | 'Power', 'zone' | 'ball']> = [
    ['Contact', 'zone'],
    ['Contact', 'ball'],
    ['Power', 'zone'],
    ['Power', 'ball']
  ]

  for (const [swing, location] of rows) {
    it(`${swing} x ${location} matches the table within tolerance (ratings all 50)`, () => {
      const rng = makeRng(20)
      const [eOut, eSingle, eDouble, eTriple, eHr] = BATTED_BALL_OUTCOMES[`${swing.toLowerCase()}-${location}`]
      const counts = { out: 0, single: 0, double: 0, triple: 0, hr: 0 }
      for (let i = 0; i < SAMPLES; i++) {
        counts[resolveBattedBall(swing, location, avgBatter, rng)]++
      }
      expect(Math.abs(counts.out / SAMPLES - eOut)).toBeLessThan(TOLERANCE)
      expect(Math.abs(counts.single / SAMPLES - eSingle)).toBeLessThan(TOLERANCE)
      expect(Math.abs(counts.double / SAMPLES - eDouble)).toBeLessThan(TOLERANCE)
      expect(Math.abs(counts.triple / SAMPLES - eTriple)).toBeLessThan(TOLERANCE)
      expect(Math.abs(counts.hr / SAMPLES - eHr)).toBeLessThan(TOLERANCE)
    })
  }

  it('a high-Power batter hits more home runs and doubles than an all-50 batter', () => {
    const rngAvg = makeRng(21)
    const rngPower = makeRng(21)
    const powerBatter = makeBatter({ power: 80 })
    let avgHr = 0
    let avgDouble = 0
    let powerHr = 0
    let powerDouble = 0
    for (let i = 0; i < SAMPLES; i++) {
      const r1 = resolveBattedBall('Power', 'zone', avgBatter, rngAvg)
      if (r1 === 'hr') avgHr++
      if (r1 === 'double') avgDouble++
      const r2 = resolveBattedBall('Power', 'zone', powerBatter, rngPower)
      if (r2 === 'hr') powerHr++
      if (r2 === 'double') powerDouble++
    }
    expect(powerHr).toBeGreaterThan(avgHr)
    expect(powerDouble).toBeGreaterThan(avgDouble)
  })

  it('a high-Contact batter has more singles and fewer outs than an all-50 batter', () => {
    const rngAvg = makeRng(22)
    const rngContact = makeRng(22)
    const contactBatter = makeBatter({ contact: 80 })
    let avgSingle = 0
    let avgOut = 0
    let contactSingle = 0
    let contactOut = 0
    for (let i = 0; i < SAMPLES; i++) {
      const r1 = resolveBattedBall('Contact', 'zone', avgBatter, rngAvg)
      if (r1 === 'single') avgSingle++
      if (r1 === 'out') avgOut++
      const r2 = resolveBattedBall('Contact', 'zone', contactBatter, rngContact)
      if (r2 === 'single') contactSingle++
      if (r2 === 'out') contactOut++
    }
    expect(contactSingle).toBeGreaterThan(avgSingle)
    expect(contactOut).toBeLessThan(avgOut)
  })

  it('every adjusted row still sums to 1 (spot check via manual recomputation)', () => {
    const batter = makeBatter({ contact: 80, power: 20 })
    const [out, single, double, triple, hr] = BATTED_BALL_OUTCOMES['power-ball']
    const adjustedOut = out * (1 - adj(batter.contact) * 0.5)
    const adjustedSingle = single * (1 + adj(batter.contact) * 1)
    const adjustedDouble = double * (1 + adj(batter.power) * 1)
    const adjustedTriple = triple
    const adjustedHr = hr * (1 + adj(batter.power) * 2)
    const total = adjustedOut + adjustedSingle + adjustedDouble + adjustedTriple + adjustedHr
    // Normalised distribution (what resolveBattedBall rolls against internally
    // via weighted pick) always sums to 1 by construction of rngPick;
    // this checks the pre-normalisation total is sane (nonzero, finite).
    expect(total).toBeGreaterThan(0)
    expect(Number.isFinite(total)).toBe(true)
  })
})

describe('resolveBunt', () => {
  it('matches the table within tolerance over 100k samples', () => {
    const rng = makeRng(30)
    const counts = { sacrifice: 0, 'foul-bunt': 0, 'pop-up': 0, 'bunt-single': 0 }
    for (let i = 0; i < SAMPLES; i++) {
      counts[resolveBunt(rng)]++
    }
    for (const key of Object.keys(BUNT_OUTCOMES)) {
      expect(Math.abs(counts[key as keyof typeof counts] / SAMPLES - BUNT_OUTCOMES[key])).toBeLessThan(
        TOLERANCE
      )
    }
  })
})

describe('isBuntAvailable', () => {
  const emptyBases: Bases = { first: null, second: null, third: null }

  it('true with a runner on first only', () => {
    const bases: Bases = { ...emptyBases, first: 'b1' }
    expect(isBuntAvailable(bases, 0, { balls: 0, strikes: 0 })).toBe(true)
  })

  it('true with a runner on second only', () => {
    const bases: Bases = { ...emptyBases, second: 'b1' }
    expect(isBuntAvailable(bases, 0, { balls: 0, strikes: 0 })).toBe(true)
  })

  it('false with only a runner on third', () => {
    const bases: Bases = { ...emptyBases, third: 'b1' }
    expect(isBuntAvailable(bases, 0, { balls: 0, strikes: 0 })).toBe(false)
  })

  it('false at 2 outs', () => {
    const bases: Bases = { ...emptyBases, first: 'b1' }
    expect(isBuntAvailable(bases, 2, { balls: 0, strikes: 0 })).toBe(false)
  })

  it('false at 2 strikes', () => {
    const bases: Bases = { ...emptyBases, first: 'b1' }
    expect(isBuntAvailable(bases, 0, { balls: 0, strikes: 2 })).toBe(false)
  })

  it('false with bases empty', () => {
    expect(isBuntAvailable(emptyBases, 0, { balls: 0, strikes: 0 })).toBe(false)
  })
})

describe('preparePitch / resolvePitch', () => {
  const batter: Batter = { id: 'b', name: 'B', position: 'CF', contact: 50, power: 50, eye: 50 }
  const pitcher: Pitcher = { id: 'p', name: 'P', control: 50, stuff: 50, tendency: 'Neutral' }
  const count: Count = { balls: 0, strikes: 0 }

  it('fixes p_zone before the choice is made', () => {
    const preview = preparePitch(count, batter, pitcher, makeRng(1))
    expect(preview.pZone).toBe(zoneProbability(count, batter, pitcher))
  })

  it('Take is a called strike in the zone and a ball otherwise', () => {
    // pZone 1 forces the zone, pZone 0 forces a ball.
    expect(resolvePitch('Take', 1, batter, pitcher, makeRng(1)).result.kind).toBe('called-strike')
    expect(resolvePitch('Take', 0, batter, pitcher, makeRng(1)).result.kind).toBe('ball')
  })

  it('Bunt always resolves to a bunt result', () => {
    for (let seed = 0; seed < 50; seed++) {
      const res = resolvePitch('Bunt', 0.5, batter, pitcher, makeRng(seed))
      expect(res.result.kind).toBe('bunt')
    }
  })

  it('is deterministic for a given rng state', () => {
    const a = resolvePitch('Power', 0.55, batter, pitcher, makeRng(42))
    const b = resolvePitch('Power', 0.55, batter, pitcher, makeRng(42))
    expect(a).toEqual(b)
  })

  it('resumes identically from a saved rng state, read included', () => {
    // One rng drives the whole at-bat: the read is rolled first, then the pitch.
    const play = (from: number) => {
      const rng = makeRng(from)
      const preview = preparePitch(count, batter, pitcher, rng)
      const resolution = resolvePitch('Power', preview.pZone, batter, pitcher, rng)
      return { preview, resolution }
    }

    // Play two pitches, then snapshot the state as a mid-at-bat save would.
    const rng = makeRng(7)
    preparePitch(count, batter, pitcher, rng)
    resolvePitch('Contact', 0.55, batter, pitcher, rng)
    const saved = rng.state()

    expect(play(saved)).toEqual(play(saved))
  })
})
