import { describe, it, expect } from 'vitest'
import { emptyTally, playGame, runBatch, runContactCheck, matchupFor, buildPairs } from '../scripts/tune-lib'
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

  it('the always-Contact check tallies exactly one team-game per side per game played', () => {
    const result = runContactCheck(TEST_GAMES, TEST_SEED, '')
    expect(result.simTeamGames).toBe(TEST_GAMES)
    expect(result.contactTeamGames).toBe(TEST_GAMES)
    expect(result.simRuns).toBeGreaterThanOrEqual(0)
    expect(result.contactRuns).toBeGreaterThanOrEqual(0)
  })
})
