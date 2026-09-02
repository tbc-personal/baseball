/**
 * Reusable harness for the Monte Carlo tuning measurement (GAME_DESIGN.md
 * section 7): playing sim-policy-vs-sim-policy games while tallying every
 * pitch/PA/half-inning league-wide, plus the section 7.1 policy matrix.
 *
 * Split out from scripts/tune.ts (the CLI entry point) so tests/tune.test.ts
 * can import the harness directly, at a small game count, without running
 * the CLI's default 10,000-game measurement on import.
 */

import { makeRng } from '../src/engine/rng'
import type { Rng } from '../src/engine/rng'
import { createGame } from '../src/engine/inning'
import type { Teams } from '../src/engine/inning'
import { applyPitch } from '../src/engine/inning'
import type { PlateAppearanceEvent } from '../src/engine/inning'
import { opponentChoice } from '../src/engine/sim'
import { ALL_TEAMS, pitcherForGame } from '../src/engine/season'
import type { Bases, Choice, Count, GameState, ReadBucket, Team } from '../src/engine/types'
import { MAX_SEED_VALUE, MAX_PITCHES_PER_GAME } from '../src/engine/constants'

// ============================================================================
// Batting policies
// ============================================================================

export type Policy = (read: ReadBucket, count: Count, bases: Bases, outs: number, rng: Rng) => Choice

export const simPolicy: Policy = opponentChoice

export const alwaysTakePolicy: Policy = () => 'Take'
export const alwaysContactPolicy: Policy = () => 'Contact'
export const alwaysPowerPolicy: Policy = () => 'Power'

/** Take until two strikes, then Contact -- the obvious "patient" exploit. */
export const patientContactPolicy: Policy = (_read, count) => (count.strikes >= 2 ? 'Contact' : 'Take')

/**
 * Take unless the read is `Likely strike` (then Power); Contact with two
 * strikes. This is the intended thoughtful play, and section 7.1 asks that
 * it beat the sim policy modestly rather than by a landslide.
 */
export const readingPolicy: Policy = (read, count) => {
  if (count.strikes >= 2) return 'Contact'
  return read === 'Likely strike' ? 'Power' : 'Take'
}

/**
 * The five section 7.1 guard policies with their required runs-vs-sim
 * bands, in the order the table lists them. `min`/`max` are fractions of
 * the sim policy's runs per team-game; a row passes inside [min, max].
 */
export interface MatrixPolicy {
  label: string
  policy: Policy
  min: number
  max: number
  why: string
}

export const MATRIX_POLICIES: MatrixPolicy[] = [
  { label: 'Always Take', policy: alwaysTakePolicy, min: 0, max: 0.6, why: 'Walking must not be free' },
  { label: 'Always Contact', policy: alwaysContactPolicy, min: 0.6, max: 1.1, why: 'One button must not dominate or be useless' },
  { label: 'Always Power', policy: alwaysPowerPolicy, min: 0, max: 1.1, why: 'Same' },
  { label: 'Take until two strikes, then Contact', policy: patientContactPolicy, min: 0, max: 1.1, why: 'The obvious "patient" exploit' },
  { label: 'Take unless Likely strike (Power); Contact with two strikes', policy: readingPolicy, min: 0.95, max: 1.3, why: 'The intended thoughtful play should win, modestly' }
]

// ============================================================================
// League-wide tally of every pitch/PA/half-inning played
// ============================================================================

export interface Tally {
  games: number
  teamGames: number
  pa: number
  ab: number
  hits: number
  bb: number
  k: number
  hr: number
  runs: number
  pitches: number
  halfInnings: number
}

export function emptyTally(): Tally {
  return { games: 0, teamGames: 0, pa: 0, ab: 0, hits: 0, bb: 0, k: 0, hr: 0, runs: 0, pitches: 0, halfInnings: 0 }
}

const HIT_EVENTS: ReadonlySet<PlateAppearanceEvent> = new Set(['single', 'double', 'triple', 'hr', 'bunt-single'])
const AB_EVENTS: ReadonlySet<PlateAppearanceEvent> = new Set([
  'single',
  'double',
  'triple',
  'hr',
  'bunt-single',
  'strikeout',
  'out',
  'double-play',
  'bunt-pop-up'
])

/** Mutates `tally` in place -- this is a hot loop over tens of millions of pitches. */
export function foldEvent(tally: Tally, event: PlateAppearanceEvent, runsOnPlay: number): void {
  tally.pa += 1
  tally.runs += runsOnPlay
  if (AB_EVENTS.has(event)) tally.ab += 1
  if (HIT_EVENTS.has(event)) tally.hits += 1
  if (event === 'hr') tally.hr += 1
  if (event === 'walk') tally.bb += 1
  if (event === 'strikeout') tally.k += 1
}

// ============================================================================
// Driving one half-inning / one game while tallying league-wide stats
// ============================================================================

/**
 * Play one half-inning to completion, folding every pitch into `tally`
 * in place. Mirrors sim.ts's simulateHalfInning, but tracks pitches/PA/
 * events as it goes instead of throwing that information away -- the
 * season stat accumulator (season.ts) only tracks the Herons, so this
 * script needs its own league-wide tally. Counts the half-inning as
 * played even if it ends short of three outs (a regulation-ending
 * walk-off) -- it still happened.
 */
export function playHalfInning(state: GameState, teams: Teams, policies: { home: Policy; away: Policy }, rng: Rng, tally: Tally): GameState {
  const startHalf = state.half
  const startInning = state.inning
  let current = state
  tally.halfInnings += 1
  let pitches = 0

  while (!current.isOver && current.half === startHalf && current.inning === startInning) {
    if (pitches >= MAX_PITCHES_PER_GAME) {
      throw new Error(`playHalfInning: exceeded ${MAX_PITCHES_PER_GAME} pitches without ending -- tuning bug, not a slow game.`)
    }
    const policy = current.half === 'top' ? policies.away : policies.home
    const choice = policy(current.currentPitch.displayedBucket, current.count, current.bases, current.outs, rng)
    const { state: next, result } = applyPitch(current, choice, teams, rng)
    tally.pitches += 1
    if (result.paEnded && result.event !== null) {
      foldEvent(tally, result.event, result.runsScored.length)
    }
    current = next
    pitches += 1
  }

  return current
}

/** Play one whole game, folding every half-inning into `tally` in place. Returns the final state. */
export function playGame(
  homeTeam: Team,
  awayTeam: Team,
  gameIndex: number,
  seed: number,
  policies: { home: Policy; away: Policy },
  tally: Tally
): GameState {
  const homePitcher = pitcherForGame(homeTeam, gameIndex)
  const awayPitcher = pitcherForGame(awayTeam, gameIndex)
  const teams: Teams = { home: homeTeam, away: awayTeam }
  let state = createGame({ gameIndex, homeTeam, awayTeam, homePitcher, awayPitcher, seed })
  const rng = makeRng(state.rngState)

  while (!state.isOver) {
    state = playHalfInning(state, teams, policies, rng, tally)
  }
  tally.games += 1
  tally.teamGames += 2
  return state
}

// ============================================================================
// Matchups: every unique pairing of the seven league teams, cycled so a
// league-wide run isn't one pairing repeated. Home/away (and, for the
// always-Contact check, which physical side plays which policy) flips
// each time the cycle of pairings repeats, so no team/slot is favored.
// ============================================================================

export function buildPairs(teams: Team[]): Array<[Team, Team]> {
  const pairs: Array<[Team, Team]> = []
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      pairs.push([teams[i], teams[j]])
    }
  }
  return pairs
}

const PAIRS = buildPairs(ALL_TEAMS)

export function matchupFor(gameIndex: number): { home: Team; away: Team; cycleFlip: boolean } {
  const pairIdx = gameIndex % PAIRS.length
  const cycle = Math.floor(gameIndex / PAIRS.length)
  const [a, b] = PAIRS[pairIdx]
  const cycleFlip = cycle % 2 === 1
  return cycleFlip ? { home: b, away: a, cycleFlip } : { home: a, away: b, cycleFlip }
}

export function drawSeed(rng: Rng): number {
  return Math.floor(rng.next() * MAX_SEED_VALUE)
}

// ============================================================================
// Running a batch of sim-vs-sim games
// ============================================================================

export interface RunOptions {
  games: number
  baseSeed: number
  /** Progress line prefix written to stderr; pass '' to silence progress lines entirely. */
  label: string
  /**
   * The policy played by both sides. Defaults to the section 5.4 sim
   * policy, which is what the section 7 band table measures. The policy
   * matrix passes each guard policy here to get its own walk rate and
   * pitches per plate appearance from a mirror batch.
   */
  policy?: Policy
}

export function runBatch(opts: RunOptions): { tally: Tally } {
  const seedRng = makeRng(opts.baseSeed)
  const tally = emptyTally()
  const progressEvery = Math.max(1, Math.floor(opts.games / 20))
  const policy = opts.policy ?? simPolicy

  for (let g = 0; g < opts.games; g++) {
    const { home, away } = matchupFor(g)
    const gameSeed = drawSeed(seedRng)
    playGame(home, away, g, gameSeed, { home: policy, away: policy }, tally)

    if (opts.label && ((g + 1) % progressEvery === 0 || g + 1 === opts.games)) {
      process.stderr.write(`[tune] ${opts.label}: ${g + 1}/${opts.games} games\n`)
    }
  }

  return { tally }
}

// ============================================================================
// Section 7.1 policy matrix: each guard policy head-to-head against the
// section 5.4 sim policy
// ============================================================================

export interface MatchupResult {
  simRuns: number
  policyRuns: number
  simTeamGames: number
  policyTeamGames: number
}

/**
 * Play `games` games with one side on `policy` and the other on the sim
 * policy, alternating which physical side (home/away) plays the guard
 * policy on every game, so the comparison is not confounded with the
 * home/away slot or with one team.
 */
export function runPolicyMatchup(policy: Policy, games: number, baseSeed: number, label = ''): MatchupResult {
  const seedRng = makeRng(baseSeed)
  let simRuns = 0
  let policyRuns = 0
  const progressEvery = Math.max(1, Math.floor(games / 20))
  const scratchTally = emptyTally() // per-pitch tally not needed here, but playGame requires one

  for (let g = 0; g < games; g++) {
    const { home, away } = matchupFor(g)
    const gameSeed = drawSeed(seedRng)
    const homePlaysPolicy = g % 2 === 0
    const policies = homePlaysPolicy ? { home: policy, away: simPolicy } : { home: simPolicy, away: policy }

    const state = playGame(home, away, g, gameSeed, policies, scratchTally)

    if (homePlaysPolicy) {
      policyRuns += state.homeScore
      simRuns += state.awayScore
    } else {
      simRuns += state.homeScore
      policyRuns += state.awayScore
    }

    if (label && ((g + 1) % progressEvery === 0 || g + 1 === games)) {
      process.stderr.write(`[tune] ${label}: ${g + 1}/${games} games\n`)
    }
  }

  return { simRuns, policyRuns, simTeamGames: games, policyTeamGames: games }
}

export interface MatrixRow {
  label: string
  min: number
  max: number
  why: string
  /** The policy's runs per team-game as a fraction of the sim policy's. */
  ratio: number
  simRate: number
  policyRate: number
  /** From the mirror batch (policy on both sides): how a degenerate optimum shows itself. */
  mirrorWalkRate: number
  mirrorPitchesPerPa: number
  pass: boolean
}

/**
 * Build the full section 7.1 matrix. For each guard policy this runs two
 * batches: a head-to-head against the sim policy (the PASS/FAIL band), and
 * a mirror batch of the policy against itself, whose walk rate and pitches
 * per plate appearance are how a reviewer sees a degenerate optimum -- a
 * policy that walks two times in three is visible in the mirror numbers
 * even before its run ratio is read.
 */
export function runPolicyMatrix(games: number, baseSeed: number, verbose = false): MatrixRow[] {
  return MATRIX_POLICIES.map((entry, i) => {
    const head = runPolicyMatchup(entry.policy, games, baseSeed + i * 2, verbose ? `matrix: ${entry.label}` : '')
    const mirror = runBatch({
      games,
      baseSeed: baseSeed + i * 2 + 1,
      label: verbose ? `mirror: ${entry.label}` : '',
      policy: entry.policy
    })

    const simRate = head.simRuns / head.simTeamGames
    const policyRate = head.policyRuns / head.policyTeamGames
    const ratio = simRate > 0 ? policyRate / simRate : Number.POSITIVE_INFINITY

    return {
      label: entry.label,
      min: entry.min,
      max: entry.max,
      why: entry.why,
      ratio,
      simRate,
      policyRate,
      mirrorWalkRate: mirror.tally.bb / mirror.tally.pa,
      mirrorPitchesPerPa: mirror.tally.pitches / mirror.tally.pa,
      pass: ratio >= entry.min && ratio <= entry.max
    }
  })
}

// ============================================================================
// §7 target bands, transcribed from GAME_DESIGN.md section 7
// ============================================================================

export interface Row {
  label: string
  value: number
  min: number
  max: number
  format: (v: number) => string
}

export function fmtAvg(v: number): string {
  // .257, not 0.257 -- the way a box score prints batting average/OBP.
  const fixed = v.toFixed(3)
  return fixed.startsWith('0.') ? fixed.slice(1) : fixed
}

export function fmtPct(v: number): string {
  return `${(v * 100).toFixed(1)}%`
}

export function fmtRuns(v: number): string {
  return v.toFixed(2)
}

export function buildRows(t: Tally): Row[] {
  return [
    { label: 'Runs per team per game', value: t.runs / t.teamGames, min: 4.2, max: 4.9, format: fmtRuns },
    { label: 'Batting average', value: t.hits / t.ab, min: 0.245, max: 0.265, format: fmtAvg },
    { label: 'On-base percentage', value: (t.hits + t.bb) / (t.ab + t.bb), min: 0.315, max: 0.335, format: fmtAvg },
    { label: 'Strikeout rate (per PA)', value: t.k / t.pa, min: 0.2, max: 0.25, format: fmtPct },
    { label: 'Walk rate (per PA)', value: t.bb / t.pa, min: 0.08, max: 0.1, format: fmtPct },
    { label: 'Home runs per team per game', value: t.hr / t.teamGames, min: 1.0, max: 1.3, format: fmtRuns },
    { label: 'Pitches per plate appearance', value: t.pitches / t.pa, min: 3.7, max: 4.0, format: fmtRuns },
    { label: 'Plate appearances per half-inning', value: t.pa / t.halfInnings, min: 4.1, max: 4.5, format: fmtRuns }
  ]
}

export function rowPasses(row: Row): boolean {
  return row.value >= row.min && row.value <= row.max
}

export function directionNote(row: Row): string {
  if (rowPasses(row)) return ''
  return row.value < row.min ? ' (too low)' : ' (too high)'
}
