/**
 * Simulation: the opponent batting policy (GAME_DESIGN.md section 5.4) and
 * the game/half-inning drivers built on it (used both by the season
 * orchestrator for Herons games and by the Monte Carlo tuning script for
 * sim-vs-sim games).
 * Pure functions only: state in, new state out. No DOM/Preact/store
 * imports, no Math.random() -- all randomness flows through the Rng from
 * rng.ts.
 */

import type { Bases, Choice, Count, GameState, ReadBucket, Team } from './types'
import type { Rng } from './rng'
import { rngBool } from './rng'
import { applyPitch } from './inning'
import type { Teams } from './inning'
import {
  OPPONENT_POLICY_CONTACT_PROBABILITY,
  MAX_PITCHES_PER_HALF_INNING,
  WIN_PROB_LOGISTIC_SCALE,
  SIM_OTHER_GAME_LOSER_RUNS_MIN,
  SIM_OTHER_GAME_LOSER_RUNS_MAX,
  SIM_OTHER_GAME_WIN_MARGIN_MIN,
  SIM_OTHER_GAME_WIN_MARGIN_MAX
} from './constants'

// ============================================================================
// Section 5.4: Opponent batting policy
// ============================================================================

/**
 * The opponent's batting policy, exactly as GAME_DESIGN.md section 5.4
 * specifies it:
 *
 *   if read == Likely ball and strikes < 2:   Take
 *   elif strikes == 2:                         Contact
 *   elif balls >= 2 and read == Likely strike: Power
 *   else:                                      Contact (p 0.6) / Power (p 0.4)
 *
 * This policy deliberately never bunts (the doc frames it as "a
 * reasonable-but-beatable policy", and bunting well is exactly the kind of
 * situational judgement call a thoughtful human player can make that this
 * simple policy does not). `bases` and `outs` are accepted -- they are
 * what a bunt decision would need -- but intentionally unused: keep it
 * that way rather than adding bunt logic here.
 */
export function opponentChoice(read: ReadBucket, count: Count, _bases: Bases, _outs: number, rng: Rng): Choice {
  if (read === 'Likely ball' && count.strikes < 2) {
    return 'Take'
  }
  if (count.strikes === 2) {
    return 'Contact'
  }
  if (count.balls >= 2 && read === 'Likely strike') {
    return 'Power'
  }
  return rngBool(rng, OPPONENT_POLICY_CONTACT_PROBABILITY) ? 'Contact' : 'Power'
}

// ============================================================================
// Driving the sim policy through a half-inning / a whole game
// ============================================================================

/**
 * Simulate one half-inning to completion using the opponent policy for
 * whichever side is currently batting, starting from `state`'s current
 * half/inning. Stops when the half-inning ends (three outs, the batting
 * side changes or the inning advances) or the game ends, whichever comes
 * first.
 *
 * Throws if MAX_PITCHES_PER_HALF_INNING is exceeded, so a tuning bug that
 * makes outs unreachable surfaces as a loud error instead of hanging.
 */
export function simulateHalfInning(state: GameState, teams: Teams, rng: Rng): GameState {
  const startHalf = state.half
  const startInning = state.inning
  let current = state
  let pitches = 0

  while (!current.isOver && current.half === startHalf && current.inning === startInning) {
    if (pitches >= MAX_PITCHES_PER_HALF_INNING) {
      throw new Error(
        `simulateHalfInning: exceeded ${MAX_PITCHES_PER_HALF_INNING} pitches without ending the half-inning ` +
          `(inning ${startInning} ${startHalf}) -- this almost certainly means a tuning bug (a probability row ` +
          'that never produces an out), not a slow but valid game.'
      )
    }

    const choice = opponentChoice(current.currentPitch.displayedBucket, current.count, current.bases, current.outs, rng)
    const { state: next } = applyPitch(current, choice, teams, rng)
    current = next
    pitches += 1
  }

  return current
}

/**
 * Simulate a whole game to completion with the sim policy on both sides.
 * This is what the Monte Carlo tuning script (section 7) uses.
 */
export function simulateGame(state: GameState, teams: Teams, rng: Rng): GameState {
  let current = state
  while (!current.isOver) {
    current = simulateHalfInning(current, teams, rng)
  }
  return current
}

// ============================================================================
// Section 5.3: Other teams' games, simulated by strength
// ============================================================================

/** A team's average (Contact + Power + Eye) per batter -- see WIN_PROB_LOGISTIC_SCALE for why. */
export function teamStrength(team: Team): number {
  const total = team.batters.reduce((sum, b) => sum + b.contact + b.power + b.eye, 0)
  return total / team.batters.length
}

/** p(home wins), from the two teams' rating-sum difference. See WIN_PROB_LOGISTIC_SCALE. */
export function winProbability(home: Team, away: Team): number {
  const diff = teamStrength(home) - teamStrength(away)
  return 1 / (1 + Math.exp(-diff / WIN_PROB_LOGISTIC_SCALE))
}

export interface SimGameOutcome {
  homeScore: number
  awayScore: number
}

function randomInt(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng.next() * (max - min + 1))
}

/**
 * Simulate a game between two teams that are not being played pitch by
 * pitch -- section 5.3's "single roll per game" for other teams' games, so
 * the standings table stays full. Draws the winner from winProbability(),
 * then rolls a plausible score (not specified by the doc -- see
 * SIM_OTHER_GAME_* constants).
 */
export function simulateGameBetween(home: Team, away: Team, rng: Rng): SimGameOutcome {
  const homeWins = rngBool(rng, winProbability(home, away))
  const loserRuns = randomInt(rng, SIM_OTHER_GAME_LOSER_RUNS_MIN, SIM_OTHER_GAME_LOSER_RUNS_MAX)
  const margin = randomInt(rng, SIM_OTHER_GAME_WIN_MARGIN_MIN, SIM_OTHER_GAME_WIN_MARGIN_MAX)
  const winnerRuns = loserRuns + margin

  return homeWins ? { homeScore: winnerRuns, awayScore: loserRuns } : { homeScore: loserRuns, awayScore: winnerRuns }
}
