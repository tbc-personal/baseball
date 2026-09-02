/**
 * Pitch resolution (GAME_DESIGN.md section 3).
 * Pure functions only: state in, new value out. No DOM/Preact/store imports,
 * no Math.random() — all randomness flows through the Rng from rng.ts.
 */

import type { Batter, Bases, Choice, Count, Pitcher, PitchLocation, ReadBucket, Rating } from './types'
import type { Rng } from './rng'
import { rngBool, rngPick } from './rng'
import {
  RATING_BASELINE,
  RATING_ADJ_DIVISOR,
  BASE_ZONE_PROBABILITY,
  COUNT_MOD,
  ZONE_CLAMP_MIN,
  ZONE_CLAMP_MAX,
  TENDENCY_MOD_ATTACKER,
  TENDENCY_MOD_NIBBLER,
  TENDENCY_MOD_NEUTRAL,
  READ_BUCKET_LIKELY_STRIKE,
  READ_BUCKET_LIKELY_BALL,
  READ_BASE_ACCURACY,
  PITCH_OUTCOMES,
  BATTED_BALL_OUTCOMES,
  CONTACT_SHIFT_SINGLE,
  CONTACT_SHIFT_OUT,
  POWER_SHIFT_DOUBLE,
  POWER_SHIFT_HR,
  BUNT_OUTCOMES
} from './constants'

// ============================================================================
// 3.1 Rating effect formula
// ============================================================================

/** adj(rating) = (rating - 50) / 100, range -0.30 .. +0.30 */
export function adj(rating: Rating): number {
  return (rating - RATING_BASELINE) / RATING_ADJ_DIVISOR
}

// ============================================================================
// 3.2 Is the pitch in the zone?
// ============================================================================

function tendencyMod(pitcher: Pitcher): number {
  switch (pitcher.tendency) {
    case 'Attacker':
      return TENDENCY_MOD_ATTACKER
    case 'Nibbler':
      return TENDENCY_MOD_NIBBLER
    case 'Neutral':
      return TENDENCY_MOD_NEUTRAL
  }
}

function countKey(count: Count): string {
  return `${count.balls}-${count.strikes}`
}

/** p_zone = BASE_ZONE + count_mod + adj(Control) + tendency_mod, clamped to [0.20, 0.90] */
export function zoneProbability(count: Count, pitcher: Pitcher): number {
  const countMod = COUNT_MOD[countKey(count)] ?? 0
  const raw = BASE_ZONE_PROBABILITY + countMod + adj(pitcher.control) + tendencyMod(pitcher)
  return Math.min(ZONE_CLAMP_MAX, Math.max(ZONE_CLAMP_MIN, raw))
}

/** Roll once for whether the pitch is in the zone or a ball. */
export function rollLocation(pZone: number, rng: Rng): PitchLocation {
  return rngBool(rng, pZone) ? 'zone' : 'ball'
}

// ============================================================================
// 3.3 The read
// ============================================================================

/** The true bucket, derived from p_zone. */
export function trueReadBucket(pZone: number): ReadBucket {
  if (pZone >= READ_BUCKET_LIKELY_STRIKE) return 'Likely strike'
  if (pZone <= READ_BUCKET_LIKELY_BALL) return 'Likely ball'
  return 'Coin flip'
}

/** Ordered buckets, low (ball) to high (strike), for adjacency lookups. */
const READ_BUCKET_ORDER: ReadBucket[] = ['Likely ball', 'Coin flip', 'Likely strike']

function adjacentBuckets(bucket: ReadBucket): ReadBucket[] {
  const idx = READ_BUCKET_ORDER.indexOf(bucket)
  const neighbours: ReadBucket[] = []
  if (idx > 0) neighbours.push(READ_BUCKET_ORDER[idx - 1])
  if (idx < READ_BUCKET_ORDER.length - 1) neighbours.push(READ_BUCKET_ORDER[idx + 1])
  return neighbours
}

/**
 * The bucket shown to the player: the true bucket with probability
 * READ_BASE_ACCURACY + adj(Eye) (clamped to [0, 1]); otherwise an adjacent
 * bucket chosen at random.
 */
export function displayedRead(pZone: number, batter: Batter, rng: Rng): ReadBucket {
  const trueBucket = trueReadBucket(pZone)
  const accuracy = Math.min(1, Math.max(0, READ_BASE_ACCURACY + adj(batter.eye)))
  if (rngBool(rng, accuracy)) {
    return trueBucket
  }
  const neighbours = adjacentBuckets(trueBucket)
  return rngPick(rng, neighbours.map((b): [ReadBucket, number] => [b, 1]))
}

// ============================================================================
// 3.4 Pitch outcome by choice x location
// ============================================================================

export type SwingOutcome = 'in play' | 'foul' | 'whiff'

function outcomeKey(choice: 'Contact' | 'Power', location: PitchLocation): string {
  return `${choice.toLowerCase()}-${location}`
}

/**
 * Resolve a swing (Contact or Power) against a pitch location.
 * Whiff probability is multiplied by 1 + adj(Stuff) - adj(Contact), clamped
 * to [0, 1], and the remainder is redistributed proportionally between
 * in-play and foul so the three outcomes still sum to 1.
 */
export function resolveSwing(
  choice: 'Contact' | 'Power',
  location: PitchLocation,
  batter: Batter,
  pitcher: Pitcher,
  rng: Rng
): SwingOutcome {
  const [inPlay, foul, whiff] = PITCH_OUTCOMES[outcomeKey(choice, location)]

  const whiffMultiplier = 1 + adj(pitcher.stuff) - adj(batter.contact)
  const adjustedWhiff = Math.min(1, Math.max(0, whiff * whiffMultiplier))

  const remaining = 1 - adjustedWhiff
  const baseRemaining = inPlay + foul
  let adjustedInPlay: number
  let adjustedFoul: number
  if (baseRemaining > 0) {
    adjustedInPlay = remaining * (inPlay / baseRemaining)
    adjustedFoul = remaining * (foul / baseRemaining)
  } else {
    adjustedInPlay = remaining / 2
    adjustedFoul = remaining / 2
  }

  return rngPick(rng, [
    ['in play', adjustedInPlay],
    ['foul', adjustedFoul],
    ['whiff', adjustedWhiff]
  ])
}

// ============================================================================
// 3.5 Batted-ball outcome
// ============================================================================

export type BattedBallResult = 'out' | 'single' | 'double' | 'triple' | 'hr'

/**
 * Resolve a batted ball's outcome. Rating shifts are applied to the base
 * row, then the row is normalised back to 1.0 before rolling.
 */
export function resolveBattedBall(
  swing: 'Contact' | 'Power',
  location: PitchLocation,
  batter: Batter,
  rng: Rng
): BattedBallResult {
  const [out, single, double, triple, hr] = BATTED_BALL_OUTCOMES[outcomeKey(swing, location)]

  const adjustedOut = out * (1 - adj(batter.contact) * CONTACT_SHIFT_OUT)
  const adjustedSingle = single * (1 + adj(batter.contact) * CONTACT_SHIFT_SINGLE)
  const adjustedDouble = double * (1 + adj(batter.power) * POWER_SHIFT_DOUBLE)
  const adjustedTriple = triple
  const adjustedHr = hr * (1 + adj(batter.power) * POWER_SHIFT_HR)

  return rngPick(rng, [
    ['out', adjustedOut],
    ['single', adjustedSingle],
    ['double', adjustedDouble],
    ['triple', adjustedTriple],
    ['hr', adjustedHr]
  ])
}

// ============================================================================
// 3.6 Bunt
// ============================================================================

export type BuntResult = 'sacrifice' | 'foul-bunt' | 'pop-up' | 'bunt-single'

export function resolveBunt(rng: Rng): BuntResult {
  return rngPick(rng, [
    ['sacrifice', BUNT_OUTCOMES.sacrifice],
    ['foul-bunt', BUNT_OUTCOMES['foul-bunt']],
    ['pop-up', BUNT_OUTCOMES['pop-up']],
    ['bunt-single', BUNT_OUTCOMES['bunt-single']]
  ])
}

/**
 * Bunt is offered as a fourth button only with a runner on first or
 * second, fewer than two outs, and fewer than two strikes.
 */
export function isBuntAvailable(bases: Bases, outs: number, count: Count): boolean {
  const runnerOnFirstOrSecond = bases.first !== null || bases.second !== null
  return runnerOnFirstOrSecond && outs < 2 && count.strikes < 2
}

// ============================================================================
// Top-level pitch resolution
// ============================================================================

export interface PitchResolution {
  location: PitchLocation
  result:
    | { kind: 'called-strike' }
    | { kind: 'ball' }
    | { kind: 'foul' }
    | { kind: 'whiff' }
    | { kind: 'in-play'; batted: BattedBallResult }
    | { kind: 'bunt'; batted: BuntResult }
}

/**
 * What the player sees before choosing. Computed once when the batter steps
 * in and stored in GameState, so that saving mid-at-bat and resuming shows
 * the same read the player already acted on.
 */
export interface PitchPreview {
  /** p_zone for this pitch; the caller passes it back into resolvePitch. */
  pZone: number
  /** The true bucket. Not shown to the player; kept for tests and box score. */
  trueBucket: ReadBucket
  /** The bucket displayed on the at-bat screen. */
  displayedBucket: ReadBucket
}

/**
 * Prepare the pitch the batter is about to face: fix p_zone and roll the
 * read that gets shown. Must be called BEFORE the player picks a choice.
 */
export function preparePitch(count: Count, batter: Batter, pitcher: Pitcher, rng: Rng): PitchPreview {
  const pZone = zoneProbability(count, pitcher)
  return {
    pZone,
    trueBucket: trueReadBucket(pZone),
    displayedBucket: displayedRead(pZone, batter, rng)
  }
}

/**
 * Resolve a single pitch given the batter's choice and the p_zone fixed by
 * preparePitch. Does not touch count, bases, outs, or any other game state —
 * that composition happens in the caller (ticket T3).
 */
export function resolvePitch(
  choice: Choice,
  pZone: number,
  batter: Batter,
  pitcher: Pitcher,
  rng: Rng
): PitchResolution {
  const location = rollLocation(pZone, rng)

  if (choice === 'Bunt') {
    return { location, result: { kind: 'bunt', batted: resolveBunt(rng) } }
  }

  if (choice === 'Take') {
    return {
      location,
      result: location === 'zone' ? { kind: 'called-strike' } : { kind: 'ball' }
    }
  }

  // Contact or Power
  const swingOutcome = resolveSwing(choice, location, batter, pitcher, rng)
  if (swingOutcome === 'whiff') return { location, result: { kind: 'whiff' } }
  if (swingOutcome === 'foul') return { location, result: { kind: 'foul' } }
  return { location, result: { kind: 'in-play', batted: resolveBattedBall(choice, location, batter, rng) } }
}
