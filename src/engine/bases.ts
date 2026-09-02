/**
 * Base running (GAME_DESIGN.md section 4 and 3.6).
 * Pure functions only: bases in, new bases + runs out. No mutation of the
 * Bases object passed in. All randomness flows through the Rng from rng.ts.
 */

import type { Bases, BatterId } from './types'
import type { Rng } from './rng'
import { rngBool } from './rng'
import {
  BASE_RUNNING_R2_SCORES_ON_SINGLE,
  BASE_RUNNING_R1_THIRD_ON_SINGLE,
  BASE_RUNNING_R1_SCORES_ON_DOUBLE,
  BASE_RUNNING_DOUBLE_PLAY,
  BASE_RUNNING_SACRIFICE_FLY
} from './constants'

export interface AdvanceResult {
  bases: Bases
  /** Batter ids that crossed the plate, in the order they scored */
  runsScored: BatterId[]
}

const EMPTY_BASES: Bases = { first: null, second: null, third: null }

// ============================================================================
// Walk
// ============================================================================

/**
 * Batter to first; runners advance only if forced (i.e. the base behind
 * them is occupied all the way back to the batter).
 */
export function advanceOnWalk(bases: Bases, batterId: BatterId): AdvanceResult {
  const runsScored: BatterId[] = []
  let { first, second, third } = bases

  if (first !== null) {
    if (second !== null) {
      if (third !== null) {
        runsScored.push(third)
      }
      third = second
    }
    second = first
  }
  first = batterId

  return { bases: { first, second, third }, runsScored }
}

// ============================================================================
// Hits (section 4)
// ============================================================================

export type Hit = 'single' | 'double' | 'triple' | 'hr'

function advanceOnSingle(bases: Bases, batterId: BatterId, rng: Rng): AdvanceResult {
  const runsScored: BatterId[] = []
  let { first, second, third } = bases

  // R3 always scores.
  if (third !== null) {
    runsScored.push(third)
    third = null
  }

  // R2 scores with p 0.65, else moves to third.
  if (second !== null) {
    if (rngBool(rng, BASE_RUNNING_R2_SCORES_ON_SINGLE)) {
      runsScored.push(second)
    } else {
      third = second
    }
    second = null
  }

  // R1 to second, or to third with p 0.30 if third is open after R2 has moved.
  if (first !== null) {
    const thirdOpen = third === null
    if (thirdOpen && rngBool(rng, BASE_RUNNING_R1_THIRD_ON_SINGLE)) {
      third = first
    } else {
      second = first
    }
    first = null
  }

  first = batterId
  return { bases: { first, second, third }, runsScored }
}

function advanceOnDouble(bases: Bases, batterId: BatterId, rng: Rng): AdvanceResult {
  const runsScored: BatterId[] = []
  let third: BatterId | null = null

  // R3 and R2 score.
  if (bases.third !== null) runsScored.push(bases.third)
  if (bases.second !== null) runsScored.push(bases.second)

  // R1 scores with p 0.45, else to third.
  if (bases.first !== null) {
    if (rngBool(rng, BASE_RUNNING_R1_SCORES_ON_DOUBLE)) {
      runsScored.push(bases.first)
    } else {
      third = bases.first
    }
  }

  return { bases: { first: null, second: batterId, third }, runsScored }
}

function advanceOnTriple(bases: Bases, batterId: BatterId): AdvanceResult {
  const runsScored = [bases.third, bases.second, bases.first].filter(
    (id): id is BatterId => id !== null
  )
  return { bases: { first: null, second: null, third: batterId }, runsScored }
}

function advanceOnHomeRun(bases: Bases, batterId: BatterId): AdvanceResult {
  const runsScored = [bases.third, bases.second, bases.first, batterId].filter(
    (id): id is BatterId => id !== null
  )
  return { bases: { ...EMPTY_BASES }, runsScored }
}

/** Advance runners (and the batter) on a hit, per GAME_DESIGN.md section 4. */
export function advanceOnHit(bases: Bases, batterId: BatterId, hit: Hit, rng: Rng): AdvanceResult {
  switch (hit) {
    case 'single':
      return advanceOnSingle(bases, batterId, rng)
    case 'double':
      return advanceOnDouble(bases, batterId, rng)
    case 'triple':
      return advanceOnTriple(bases, batterId)
    case 'hr':
      return advanceOnHomeRun(bases, batterId)
  }
}

// ============================================================================
// Outs (section 4)
// ============================================================================

export type OutKind = 'double-play' | 'sacrifice-fly' | 'plain'

export interface OutResult extends AdvanceResult {
  outsAdded: number
  kind: OutKind
}

/**
 * Advance runners (or remove them) on an out from a ball in play, per
 * GAME_DESIGN.md section 4. Does not itself know whether this out ends the
 * half-inning; the caller applies the "no runs score on the third out"
 * rule if needed (in practice it never conflicts here: a double play only
 * fires when outs < 2, so it can add at most 2 outs -> never a run-scoring
 * play landing on out #3; a sacrifice fly is likewise gated to outs < 2 and
 * only ever adds 1 out, so it never lands on out #3 either).
 */
export function advanceOnOut(bases: Bases, outs: number, rng: Rng): OutResult {
  if (outs < 2 && bases.first !== null) {
    if (rngBool(rng, BASE_RUNNING_DOUBLE_PLAY)) {
      return {
        bases: { ...bases, first: null },
        runsScored: [],
        outsAdded: 2,
        kind: 'double-play'
      }
    }
  }

  if (outs < 2 && bases.third !== null) {
    if (rngBool(rng, BASE_RUNNING_SACRIFICE_FLY)) {
      return {
        bases: { ...bases, third: null },
        runsScored: [bases.third],
        outsAdded: 1,
        kind: 'sacrifice-fly'
      }
    }
  }

  return { bases: { ...bases }, runsScored: [], outsAdded: 1, kind: 'plain' }
}

// ============================================================================
// Bunt (section 3.6)
// ============================================================================

/** Sacrifice bunt: batter out, all runners advance one base. */
export function advanceOnBuntSacrifice(bases: Bases): AdvanceResult {
  const runsScored: BatterId[] = []
  let third: BatterId | null = null
  let second: BatterId | null = null

  if (bases.third !== null) runsScored.push(bases.third)
  if (bases.second !== null) third = bases.second
  if (bases.first !== null) second = bases.first

  return { bases: { first: null, second, third }, runsScored }
}

/** Bunt single: batter safe at first, runners advance one base. */
export function advanceOnBuntSingle(bases: Bases, batterId: BatterId): AdvanceResult {
  const runsScored: BatterId[] = []
  let third: BatterId | null = null
  let second: BatterId | null = null

  if (bases.third !== null) runsScored.push(bases.third)
  if (bases.second !== null) third = bases.second
  if (bases.first !== null) second = bases.first

  return { bases: { first: batterId, second, third }, runsScored }
}
