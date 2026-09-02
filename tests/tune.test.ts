import { describe, it, expect } from 'vitest'
import { emptyTally, playGame, runBatch, runPolicyMatchup, runPolicyMatrix, MATRIX_POLICIES, alwaysTakePolicy, matchupFor, buildPairs } from '../scripts/tune-lib'
import { ALL_TEAMS } from '../src/engine/season'

// A few dozen games: this guards the measurement harness itself, not the
// tuning. It should stay fast; the 10,000-game measurement is scripts/tune.ts.
const TEST_GAMES = 40
const TEST_SEED = 7

describe('tune-lib measurement harness self-consistency', () => {
  it('total PA equals the sum of PA-ending events (AB events + walk)', () => {
    const { tally } = runBatch({ games: TEST_GAMES, baseSeed: TEST_SEED, label: '' })
    // Every PA ends in exactly one of: an AB event, or a walk, or a
    // sacrifice (fly/bunt) -- sacrifices are PAs that are neither AB nor
    // BB, so PA >= ab + bb, with the gap explained by sacrifices.
    expect(tally.pa).toBeGreaterThanOrEqual(tally.ab + tally.bb)
    expect(tally.pa).toBeGreaterThan(0)
  })

  it('hits never exceed at-bats', () => {
    const { tally } = runBatch({ games: TEST_GAMES, baseSeed: TEST_SEED, label: '' })
    expect(tally.hits).toBeLessThanOrEqual(tally.ab)
  })

  it('home runs never exceed hits, and hits never exceed PA', () => {
    const { tally } = runBatch({ games: TEST_GAMES, baseSeed: TEST_SEED, label: '' })
    expect(tally.hr).toBeLessThanOrEqual(tally.hits)
    expect(tally.hits).toBeLessThanOrEqual(tally.pa)
  })

  it('walks and strikeouts never exceed total PA, and pitches never fewer than PA', () => {
    const { tally } = runBatch({ games: TEST_GAMES, baseSeed: TEST_SEED, label: '' })
    expect(tally.bb).toBeLessThanOrEqual(tally.pa)
    expect(tally.k).toBeLessThanOrEqual(tally.pa)
    // Every PA takes at least one pitch.
    expect(tally.pitches).toBeGreaterThanOrEqual(tally.pa)
  })

  it('every half-inning tallied had at least one plate appearance', () => {
    const { tally } = runBatch({ games: TEST_GAMES, baseSeed: TEST_SEED, label: '' })
    // A half-inning always ends in outs or (bottom, final inning) a
    // walk-off, and both require at least one PA to have happened.
    expect(tally.pa).toBeGreaterThanOrEqual(tally.halfInnings)
    expect(tally.halfInnings).toBeGreaterThan(0)
  })

  it('games and team-games are consistent (two team-games per game)', () => {
    const { tally } = runBatch({ games: TEST_GAMES, baseSeed: TEST_SEED, label: '' })
    expect(tally.games).toBe(TEST_GAMES)
    expect(tally.teamGames).toBe(TEST_GAMES * 2)
  })

  it('the runs tallied by playGame match the sum of each game\'s home+away score', () => {
    const tally = emptyTally()
    let summedFinalScores = 0
    for (let g = 0; g < TEST_GAMES; g++) {
      const { home, away } = matchupFor(g)
      const state = playGame(home, away, g, 1000 + g, { home: () => 'Contact', away: () => 'Contact' }, tally)
      summedFinalScores += state.homeScore + state.awayScore
    }
    expect(tally.runs).toBe(summedFinalScores)
  })

  it('a run is a reproducible deterministic function of the base seed', () => {
    const a = runBatch({ games: TEST_GAMES, baseSeed: TEST_SEED, label: '' })
    const b = runBatch({ games: TEST_GAMES, baseSeed: TEST_SEED, label: '' })
    expect(a.tally).toEqual(b.tally)
  })

  it('a different base seed produces a different tally (sanity check that the seed actually matters)', () => {
    const a = runBatch({ games: TEST_GAMES, baseSeed: TEST_SEED, label: '' })
    const b = runBatch({ games: TEST_GAMES, baseSeed: TEST_SEED + 1000, label: '' })
    expect(a.tally).not.toEqual(b.tally)
  })

  it('buildPairs covers every unique pairing of the seven league teams exactly once', () => {
    const pairs = buildPairs(ALL_TEAMS)
    expect(pairs.length).toBe((ALL_TEAMS.length * (ALL_TEAMS.length - 1)) / 2)
    const seen = new Set(pairs.map(([a, b]) => [a.id, b.id].sort().join('/')))
    expect(seen.size).toBe(pairs.length)
  })

  it('matchupFor always returns two distinct teams from the league', () => {
    const ids = new Set(ALL_TEAMS.map((t) => t.id))
    for (let g = 0; g < 60; g++) {
      const { home, away } = matchupFor(g)
      expect(home.id).not.toBe(away.id)
      expect(ids.has(home.id)).toBe(true)
      expect(ids.has(away.id)).toBe(true)
    }
  })

  it('a head-to-head matchup tallies exactly one team-game per side per game played', () => {
    const result = runPolicyMatchup(alwaysTakePolicy, TEST_GAMES, TEST_SEED, '')
    expect(result.simTeamGames).toBe(TEST_GAMES)
    expect(result.policyTeamGames).toBe(TEST_GAMES)
    expect(result.simRuns).toBeGreaterThanOrEqual(0)
    expect(result.policyRuns).toBeGreaterThanOrEqual(0)
  })

  it('a mirror batch runs the policy on both sides, not the sim policy', () => {
    // Always-Take can only ever end a plate appearance in a walk or a
    // strikeout, so a mirror batch of it records no hits at all. That is a
    // cheap proof the policy argument is actually reaching both sides.
    const { tally } = runBatch({ games: 4, baseSeed: TEST_SEED, label: '', policy: alwaysTakePolicy })
    expect(tally.hits).toBe(0)
    expect(tally.bb + tally.k).toBe(tally.pa)
  })
})

describe('section 7.1 policy matrix', () => {
  it('covers the five guard policies with the bands section 7.1 states', () => {
    expect(MATRIX_POLICIES.map((p) => p.label)).toEqual([
      'Always Take',
      'Always Contact',
      'Always Power',
      'Take until two strikes, then Contact',
      'Take unless Likely strike (Power); Contact with two strikes'
    ])
    expect(MATRIX_POLICIES.map((p) => [p.min, p.max])).toEqual([
      [0, 0.6],
      [0.6, 1.1],
      [0, 1.1],
      [0, 1.1],
      [0.95, 1.3]
    ])
  })

  it('builds one row per policy, each with a ratio, mirror stats and a verdict', () => {
    const matrix = runPolicyMatrix(6, TEST_SEED)
    expect(matrix).toHaveLength(MATRIX_POLICIES.length)
    for (const row of matrix) {
      expect(row.ratio).toBeGreaterThanOrEqual(0)
      expect(Number.isFinite(row.ratio)).toBe(true)
      expect(row.mirrorWalkRate).toBeGreaterThanOrEqual(0)
      expect(row.mirrorWalkRate).toBeLessThanOrEqual(1)
      expect(row.mirrorPitchesPerPa).toBeGreaterThanOrEqual(1)
      expect(row.pass).toBe(row.ratio >= row.min && row.ratio <= row.max)
    }
  })

  it('the always-Take row walks far more often than the sim policy does', () => {
    const matrix = runPolicyMatrix(6, TEST_SEED)
    const take = matrix.find((r) => r.label === 'Always Take')
    const contact = matrix.find((r) => r.label === 'Always Contact')
    expect(take).toBeDefined()
    expect(contact).toBeDefined()
    // Always-Contact never takes a pitch, so it can never walk.
    expect(contact!.mirrorWalkRate).toBe(0)
    expect(take!.mirrorWalkRate).toBeGreaterThan(contact!.mirrorWalkRate)
  })
})
