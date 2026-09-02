/**
 * Applying a resolved pitch to game state, and half-inning / game-end
 * transitions (GAME_DESIGN.md sections 3.4 and 4).
 * Pure functions only: state in, new state out. No mutation of the
 * GameState passed in. All randomness flows through the Rng from rng.ts.
 */

import type { BatterId, Batter, Bases, Choice, Count, GameState, HalfInning, Pitcher, Team } from './types'
import type { Rng } from './rng'
import { makeRng } from './rng'
import { preparePitch, resolvePitch } from './pitch'
import type { PitchResolution } from './pitch'
import {
  advanceOnWalk,
  advanceOnHit,
  advanceOnOut,
  advanceOnBuntSacrifice,
  advanceOnBuntSingle
} from './bases'
import { INNINGS_PER_GAME, OUTS_PER_HALF_INNING, BALLS_FOR_WALK, STRIKES_FOR_STRIKEOUT } from './constants'

const EMPTY_BASES: Bases = { first: null, second: null, third: null }

export interface Teams {
  home: Team
  away: Team
}

export interface CreateGameArgs {
  gameIndex: number
  homeTeam: Team
  awayTeam: Team
  homePitcher: Pitcher
  awayPitcher: Pitcher
  seed: number
}

export type PlateAppearanceEvent =
  | 'walk'
  | 'strikeout'
  | 'single'
  | 'double'
  | 'triple'
  | 'hr'
  | 'out'
  | 'double-play'
  | 'sacrifice-fly'
  | 'sacrifice-bunt'
  | 'bunt-single'
  | 'bunt-pop-up'

export interface ApplyPitchResult {
  pitchResolution: PitchResolution
  /** Did this pitch end the plate appearance? */
  paEnded: boolean
  /** What the plate appearance resolved as, if it ended */
  event: PlateAppearanceEvent | null
  runsScored: BatterId[]
  outsAdded: number
  /** Did this pitch end the half-inning (the 3rd out)? */
  halfInningEnded: boolean
  /**
   * Runners stranded when this pitch ended the half-inning; null otherwise.
   * Counted here rather than in the UI because the bases are cleared by the
   * transition, so it cannot be recovered from the returned state.
   */
  runnersLeftOnBase: number | null
  /** Did this pitch end the game? */
  gameEnded: boolean
  /** The human-readable line added to the play log (if any) */
  play: string | null
}

// ============================================================================
// Batting side helpers
// ============================================================================

function battingSide(half: HalfInning): 'home' | 'away' {
  return half === 'top' ? 'away' : 'home'
}

function pitchingSide(half: HalfInning): 'home' | 'away' {
  return half === 'top' ? 'home' : 'away'
}

function teamFor(teams: Teams, side: 'home' | 'away'): Team {
  return side === 'home' ? teams.home : teams.away
}

function pitcherIdFor(state: GameState, side: 'home' | 'away'): string {
  return side === 'home' ? state.homePitcherId : state.awayPitcherId
}

function findPitcher(team: Team, pitcherId: string): Pitcher {
  const pitcher = team.pitchers.find((p) => p.id === pitcherId)
  if (!pitcher) {
    throw new Error(`Pitcher ${pitcherId} not found on team ${team.id}`)
  }
  return pitcher
}

function currentBatter(state: GameState, teams: Teams): Batter {
  const side = battingSide(state.half)
  const team = teamFor(teams, side)
  return team.batters[state.currentBatterIndex[side]]
}

function currentPitcher(state: GameState, teams: Teams): Pitcher {
  const side = pitchingSide(state.half)
  const team = teamFor(teams, side)
  return findPitcher(team, pitcherIdFor(state, side))
}

// ============================================================================
// Play-by-play (kept in one place so it's easy to change)
// ============================================================================

function describeCount(count: Count): string {
  return `${count.balls}-${count.strikes}`
}

// ============================================================================
// Out flavour (play log colour)
// ============================================================================

/**
 * How an out looked, for the play log: "grounded out to short", "flied out
 * to center". Purely descriptive -- it never changes what happened, only
 * how it reads.
 *
 * The variation is indexed off the RNG's state AFTER the pitch rather than
 * drawn from it. That is deliberate: a new draw would shift the RNG stream,
 * which would change every tuned measurement in TUNING.md and make existing
 * saves replay differently. Reading the state is a pure function of a
 * number the pitch already produced, so a game still replays identically
 * from its seed.
 *
 * The two tables differ by swing, as a Power swing and a Contact swing put
 * the ball in the air at very different rates: Contact skews to the
 * infield and to grounders, Power to the outfield and to fly balls.
 * Entries repeat where an outcome should be commoner.
 */
const CONTACT_OUTS: readonly string[] = [
  'grounded out to short',
  'grounded out to short',
  'grounded out to second',
  'grounded out to second',
  'grounded out to third',
  'grounded out to first',
  'grounded out to the pitcher',
  'lined out to left',
  'lined out to center',
  'popped out to second',
  'popped out to the catcher',
  'flied out to left',
  'flied out to center',
  'flied out to right'
]

const POWER_OUTS: readonly string[] = [
  'flied out to left',
  'flied out to center',
  'flied out to center',
  'flied out to right',
  'flied out to deep center',
  'flied out to the warning track in left',
  'lined out to left',
  'lined out to center',
  'lined out to right',
  'lined out to third',
  'popped out to the catcher',
  'grounded out to short',
  'grounded out to third'
]

/** Which way the ball left the bat, given the swing and a pitch-derived index. */
export function outFlavor(swing: Choice, flavorSeed: number): string {
  const table = swing === 'Power' ? POWER_OUTS : CONTACT_OUTS
  const idx = Math.abs(Math.trunc(flavorSeed)) % table.length
  return table[idx]
}

/** How a sacrifice fly looked. Always to the outfield -- that is what makes it a sac fly. */
const SAC_FLY_FIELDS: readonly string[] = ['left', 'center', 'right', 'deep center', 'deep right']

export function sacrificeFlyField(flavorSeed: number): string {
  return SAC_FLY_FIELDS[Math.abs(Math.trunc(flavorSeed)) % SAC_FLY_FIELDS.length]
}

function describePlay(
  batter: Batter,
  event: PlateAppearanceEvent,
  count: Count,
  runsScored: BatterId[],
  battingTeam: Team,
  swing: Choice,
  flavorSeed: number
): string {
  const scorers = runsScored.map((id) => battingTeam.batters.find((b) => b.id === id)?.name ?? id)
  const scoreSuffix =
    scorers.length > 0 ? ` ${scorers.join(', ')} score${scorers.length === 1 ? 's' : ''}.` : ''

  switch (event) {
    case 'walk':
      return `${batter.name} walks.${scoreSuffix}`
    case 'strikeout':
      return `${batter.name} strikes out on a ${describeCount(count)} pitch.`
    case 'single':
      return `${batter.name} singles.${scoreSuffix}`
    case 'double':
      return `${batter.name} doubles.${scoreSuffix}`
    case 'triple':
      return `${batter.name} triples.${scoreSuffix}`
    case 'hr':
      return `${batter.name} homers!${scoreSuffix}`
    case 'double-play':
      return `${batter.name} grounds into a double play.`
    case 'sacrifice-fly':
      return `${batter.name} flied out to ${sacrificeFlyField(flavorSeed)}. ${scorers.join(', ')} scores on the sacrifice fly.`
    case 'out':
      return `${batter.name} ${outFlavor(swing, flavorSeed)}.`
    case 'sacrifice-bunt':
      return `${batter.name} sacrifices.${scoreSuffix}`
    case 'bunt-single':
      return `${batter.name} bunts for a single.${scoreSuffix}`
    case 'bunt-pop-up':
      return `${batter.name} pops out on the bunt.`
  }
}

// ============================================================================
// Applying a pitch
// ============================================================================

/**
 * Apply the batter's choice to the pitch already previewed in
 * state.currentPitch, run the count/base-running rules, and return the new
 * state plus a descriptor for the caller (UI, tests).
 */
export function applyPitch(state: GameState, choice: Choice, teams: Teams, rng: Rng): { state: GameState; result: ApplyPitchResult } {
  const batter = currentBatter(state, teams)
  const pitcher = currentPitcher(state, teams)

  const pitchResolution = resolvePitch(choice, state.currentPitch.pZone, batter, pitcher, rng)

  let count: Count = { ...state.count }
  let bases: Bases = state.bases
  let outs = state.outs
  let runsScored: BatterId[] = []
  let event: PlateAppearanceEvent | null = null
  let paEnded = false

  switch (pitchResolution.result.kind) {
    case 'called-strike':
    case 'whiff': {
      const strikes = count.strikes + 1
      if (strikes >= STRIKES_FOR_STRIKEOUT) {
        event = 'strikeout'
        paEnded = true
        outs += 1
      } else {
        count = { ...count, strikes }
      }
      break
    }
    case 'ball': {
      const balls = count.balls + 1
      if (balls >= BALLS_FOR_WALK) {
        const advance = advanceOnWalk(bases, batter.id)
        bases = advance.bases
        runsScored = advance.runsScored
        event = 'walk'
        paEnded = true
      } else {
        count = { ...count, balls }
      }
      break
    }
    case 'foul': {
      if (count.strikes < 2) {
        count = { ...count, strikes: count.strikes + 1 }
      }
      // foul with two strikes keeps the count unchanged
      break
    }
    case 'in-play': {
      const batted = pitchResolution.result.batted
      if (batted === 'out') {
        const out = advanceOnOut(bases, outs, rng)
        bases = out.bases
        runsScored = out.runsScored
        outs += out.outsAdded
        event = out.kind === 'plain' ? 'out' : out.kind
      } else {
        const advance = advanceOnHit(bases, batter.id, batted, rng)
        bases = advance.bases
        runsScored = advance.runsScored
        event = batted
      }
      paEnded = true
      break
    }
    case 'bunt': {
      const batted = pitchResolution.result.batted
      if (batted === 'sacrifice') {
        const advance = advanceOnBuntSacrifice(bases)
        bases = advance.bases
        runsScored = advance.runsScored
        outs += 1
        event = 'sacrifice-bunt'
        paEnded = true
      } else if (batted === 'pop-up') {
        outs += 1
        event = 'bunt-pop-up'
        paEnded = true
      } else if (batted === 'bunt-single') {
        const advance = advanceOnBuntSingle(bases, batter.id)
        bases = advance.bases
        runsScored = advance.runsScored
        event = 'bunt-single'
        paEnded = true
      } else {
        // foul-bunt: a strike; strike three (even a foul bunt) is a strikeout
        if (count.strikes >= 2) {
          event = 'strikeout'
          paEnded = true
          outs += 1
        } else {
          count = { ...count, strikes: count.strikes + 1 }
        }
      }
      break
    }
  }

  // GAME_DESIGN.md section 3.4: "When a plate appearance ends for any reason,
  // the next batter starts at 0-0." The count is per plate appearance, not
  // per half-inning, so it resets here rather than only in endHalfInning.
  if (paEnded) {
    count = { balls: 0, strikes: 0 }
  }

  const battingIdx = battingSide(state.half)
  const battingTeam = teamFor(teams, battingIdx)

  let play: string | null = null
  if (paEnded && event !== null) {
    play = describePlay(batter, event, state.count, runsScored, battingTeam, choice, rng.state())
  }

  // Credit runs and hits.
  let homeScore = state.homeScore
  let awayScore = state.awayScore
  let hits = state.hits
  let lineScore = state.lineScore
  if (runsScored.length > 0) {
    if (battingIdx === 'home') {
      homeScore += runsScored.length
    } else {
      awayScore += runsScored.length
    }
  }
  // Always record the column, even for a scoreless inning: an inning that was
  // played reads 0 on the line score, while one not yet reached stays absent.
  lineScore = addToLineScore(lineScore, battingIdx, state.inning, runsScored.length)
  const isHit = event === 'single' || event === 'double' || event === 'triple' || event === 'hr' || event === 'bunt-single'
  if (isHit) {
    hits = { ...hits, [battingIdx]: hits[battingIdx] + 1 }
  }

  // Advance the batting order only when the plate appearance ended.
  let currentBatterIndex = state.currentBatterIndex
  if (paEnded) {
    const nextIdx = (state.currentBatterIndex[battingIdx] + 1) % battingTeam.batters.length
    currentBatterIndex = { ...currentBatterIndex, [battingIdx]: nextIdx }
  }

  const plays = play !== null ? [...state.plays, play] : state.plays

  let nextState: GameState = {
    ...state,
    count,
    bases,
    outs,
    homeScore,
    awayScore,
    hits,
    lineScore,
    currentBatterIndex,
    plays,
    rngState: rng.state()
  }

  let halfInningEnded = false
  let gameEnded = false

  // Walk-off: once regulation is complete, the home team taking the lead
  // ends the game immediately rather than at the third out. GAME_DESIGN.md
  // section 4 only states the end-of-half check, but section 6 lists a
  // "first walk-off" milestone, so this is the reading closest to baseball.
  if (
    state.half === 'bottom' &&
    state.inning >= INNINGS_PER_GAME &&
    homeScore > awayScore
  ) {
    nextState = { ...nextState, isOver: true }
    return {
      state: nextState,
      result: {
        pitchResolution,
        paEnded,
        event,
        runsScored,
        outsAdded: outs - state.outs,
        halfInningEnded: false,
        runnersLeftOnBase: null,
        gameEnded: true,
        play
      }
    }
  }

  let runnersLeftOnBase: number | null = null

  if (outs >= OUTS_PER_HALF_INNING) {
    halfInningEnded = true
    runnersLeftOnBase = [bases.first, bases.second, bases.third].filter((r) => r !== null).length
    const transition = endHalfInning(nextState, teams, rng)
    nextState = transition.state
    gameEnded = transition.gameEnded
  } else {
    // Same batter (PA continues) or the next batter (PA ended): roll the
    // next pitch's read against the fresh count.
    nextState = withNextPitchPreview(nextState, teams, rng)
  }

  return {
    state: nextState,
    result: {
      pitchResolution,
      paEnded,
      event,
      runsScored,
      outsAdded: outs - state.outs,
      halfInningEnded,
      runnersLeftOnBase,
      gameEnded,
      play
    }
  }
}

function addToLineScore(
  lineScore: GameState['lineScore'],
  side: 'home' | 'away',
  inning: number,
  runs: number
): GameState['lineScore'] {
  const column = [...lineScore[side]]
  const idx = inning - 1
  while (column.length <= idx) {
    column.push(0)
  }
  column[idx] += runs
  return { ...lineScore, [side]: column }
}

function withNextPitchPreview(state: GameState, teams: Teams, rng: Rng): GameState {
  const batter = currentBatter(state, teams)
  const pitcher = currentPitcher(state, teams)
  const currentPitch = preparePitch(state.count, batter, pitcher, rng)
  return { ...state, currentPitch, rngState: rng.state() }
}

/**
 * Three outs: clear bases, reset outs and count, reset the play log, flip
 * half/inning, and apply the game-end rules from section 4.
 */
function endHalfInning(state: GameState, teams: Teams, rng: Rng): { state: GameState; gameEnded: boolean } {
  const base: GameState = {
    ...state,
    outs: 0,
    count: { balls: 0, strikes: 0 },
    bases: { ...EMPTY_BASES },
    plays: []
  }

  if (state.half === 'top') {
    // Away just finished batting. The home team does not bat in the
    // bottom of an inning it already leads after the top, once regulation
    // is complete.
    if (state.inning >= INNINGS_PER_GAME && state.homeScore > state.awayScore) {
      return { state: { ...base, isOver: true }, gameEnded: true }
    }
    const nextState = withNextPitchPreview({ ...base, half: 'bottom' }, teams, rng)
    return { state: nextState, gameEnded: false }
  }

  // Home just finished batting (bottom of an inning ended).
  if (state.inning >= INNINGS_PER_GAME && state.homeScore !== state.awayScore) {
    return { state: { ...base, isOver: true }, gameEnded: true }
  }
  const nextState = withNextPitchPreview({ ...base, half: 'top', inning: state.inning + 1 }, teams, rng)
  return { state: nextState, gameEnded: false }
}

// ============================================================================
// Game creation
// ============================================================================

/** Build a fresh GameState for a matchup, with the first pitch's read already prepared. */
export function createGame(args: CreateGameArgs): GameState {
  const rng = makeRng(args.seed)

  const state: GameState = {
    gameIndex: args.gameIndex,
    homeTeamId: args.homeTeam.id,
    awayTeamId: args.awayTeam.id,
    homePitcherId: args.homePitcher.id,
    awayPitcherId: args.awayPitcher.id,
    currentPitch: { pZone: 0, trueBucket: 'Coin flip', displayedBucket: 'Coin flip' }, // overwritten below
    inning: 1,
    half: 'top',
    outs: 0,
    count: { balls: 0, strikes: 0 },
    bases: { ...EMPTY_BASES },
    homeScore: 0,
    awayScore: 0,
    lineScore: { home: [], away: [] },
    hits: { home: 0, away: 0 },
    currentBatterIndex: { home: 0, away: 0 },
    rngState: rng.state(),
    plays: [],
    isOver: false
  }

  const teams: Teams = { home: args.homeTeam, away: args.awayTeam }
  return withNextPitchPreview(state, teams, rng)
}
