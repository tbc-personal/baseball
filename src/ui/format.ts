/**
 * Pure presentation logic for the at-bat screen. Nothing here computes
 * baseball -- it only formats/derives display values from engine state and
 * engine selectors (GAME_DESIGN.md 3, 8; PLAN.md "the UI never computes
 * baseball"). Kept in one file, with no Preact import, so it can be unit
 * tested directly without @testing-library/preact (tests/ui.at-bat.test.tsx).
 */

import type { Bases, Batter, BatterStats, Count, HalfInning } from '../engine/types'
import { battingAverage } from '../engine/season'
import { BALLS_FOR_WALK, STRIKES_FOR_STRIKEOUT, OUTS_PER_HALF_INNING } from '../engine/constants'

// ============================================================================
// Ordinals / labels
// ============================================================================

/** 1 -> "1st", 2 -> "2nd", 3 -> "3rd", 4 -> "4th", 11 -> "11th", ... */
export function ordinal(n: number): string {
  const abs = Math.abs(n)
  const mod100 = abs % 100
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`
  switch (abs % 10) {
    case 1:
      return `${n}st`
    case 2:
      return `${n}nd`
    case 3:
      return `${n}rd`
    default:
      return `${n}th`
  }
}

/** "Top 1st", "Bot 4th", etc, matching the mockup's score-strip label. */
export function halfInningLabel(half: HalfInning, inning: number): string {
  const prefix = half === 'top' ? 'Top' : 'Bot'
  return `${prefix} ${ordinal(inning)}`
}

/** "3rd in order" from a 0-based batting-order index. */
export function battingOrderLabel(index: number): string {
  return `${ordinal(index + 1)} in order`
}

// ============================================================================
// Count dots (Balls / Strikes / Outs rows)
// ============================================================================

export type DotState = 'filled' | 'hollow'

/**
 * One row of dots for a count/outs display: `total - 1` dots (the count
 * before the pitch that would end the at-bat/half-inning never needs a
 * dot slot of its own -- e.g. 3 ball dots for a 4-ball walk), the first
 * `current` of them filled.
 */
function dotRow(current: number, total: number): DotState[] {
  const slots = Math.max(0, total - 1)
  return Array.from({ length: slots }, (_, i) => (i < current ? 'filled' : 'hollow'))
}

export interface CountDots {
  balls: DotState[]
  strikes: DotState[]
  outs: DotState[]
}

/** Dot rows for the count/outs display, sized off the engine's own constants. */
export function countDots(count: Count, outs: number): CountDots {
  return {
    balls: dotRow(count.balls, BALLS_FOR_WALK),
    strikes: dotRow(count.strikes, STRIKES_FOR_STRIKEOUT),
    outs: dotRow(outs, OUTS_PER_HALF_INNING)
  }
}

/** "2–1" (balls, en dash, strikes), matching the mockup's big count numeral. */
export function countNumeral(count: Count): string {
  return `${count.balls}–${count.strikes}`
}

// ============================================================================
// Runners
// ============================================================================

/** A player's surname for the compact runner label beside the diamond. */
export function surname(fullName: string): string {
  const tokens = fullName.trim().split(/\s+/)
  return tokens.length > 0 ? tokens[tokens.length - 1] : fullName
}

/**
 * The mockup abbreviates a long surname to fit beside the diamond's fixed
 * SVG canvas ("Marco Villanueva" -> "Vill.", while the shorter "Okafor"
 * stays whole) rather than letting it run off the edge. Same rule here:
 * names at or under 6 characters print in full, longer ones truncate to
 * 4 characters plus a period.
 */
export function abbreviateSurname(name: string): string {
  return name.length <= 6 ? name : `${name.slice(0, 4)}.`
}

export interface RunnerDisplay {
  first: string | null
  second: string | null
  third: string | null
}

/** Abbreviated surnames of runners on base, or null for an empty base, keyed by batter id lookup. */
export function runnerDisplay(bases: Bases, batters: readonly Batter[]): RunnerDisplay {
  const nameOf = (id: string | null): string | null => {
    if (id === null) return null
    const batter = batters.find((b) => b.id === id)
    return batter ? abbreviateSurname(surname(batter.name)) : id
  }
  return {
    first: nameOf(bases.first),
    second: nameOf(bases.second),
    third: nameOf(bases.third)
  }
}

// ============================================================================
// Batter card
// ============================================================================

/** Formats a rate stat like 0.281 as ".281" (no leading zero), matching the mockup. */
export function formatAverage(rate: number): string {
  const clamped = Math.max(0, rate)
  const fixed = clamped.toFixed(3)
  return fixed.startsWith('0') ? fixed.slice(1) : fixed
}

/** The batter card's season line, e.g. ".281 · 4 HR". */
export function seasonLine(stats: BatterStats): string {
  return `${formatAverage(battingAverage(stats))} · ${stats.hr} HR`
}
