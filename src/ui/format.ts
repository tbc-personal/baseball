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

// ============================================================================
// T8: presentation logic for the home, between-innings, season and settings
// screens. Pure functions only -- components stay thin enough that testing
// these is honest coverage of the screens' behaviour.
// ============================================================================

/**
 * The gutter marker beside a play in the between-innings recap
 * (docs/mockups/Between.dc.html): the out number, or a dash when the play
 * recorded no out. It reads red when the play scored.
 */
export function playGutter(entry: { outsAfter: number; runsScored: number; }, outsBefore: number): {
  marker: string
  scored: boolean
} {
  const recordedAnOut = entry.outsAfter > outsBefore
  return { marker: recordedAnOut ? String(entry.outsAfter) : '—', scored: entry.runsScored > 0 }
}

/** "1 run · 2 hits · 1 LOB", pluralised, as the mockup's half-inning summary. */
export function halfInningSummary(runs: number, hits: number, leftOnBase: number): string {
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`
  return `${plural(runs, 'run')} · ${plural(hits, 'hit')} · ${leftOnBase} LOB`
}

/**
 * The home screen's one primary action (GAME_DESIGN.md 2: the home screen
 * always shows exactly one).
 */
export type PrimaryAction =
  | { kind: 'resume'; label: string }
  | { kind: 'play-half'; label: string }
  | { kind: 'next-game'; label: string }
  | { kind: 'season-over'; label: string }

export function primaryAction(opts: {
  seasonComplete: boolean
  hasGameInProgress: boolean
  midAtBat: boolean
  half: HalfInning
  inning: number
}): PrimaryAction {
  if (opts.seasonComplete) return { kind: 'season-over', label: 'Season over' }
  if (!opts.hasGameInProgress) return { kind: 'next-game', label: 'Start the next game' }
  const where = `the ${ordinal(opts.inning)}`
  if (opts.midAtBat) return { kind: 'resume', label: `Pick up ${where}` }
  return { kind: 'play-half', label: `Play ${where}` }
}

/** "Bottom of the 4th. Two on, one out, Achterberg up. You left it at a 2-1 count." */
export function resumeSentence(opts: {
  half: HalfInning
  inning: number
  runnersOn: number
  outs: number
  batterSurname: string
  balls: number
  strikes: number
}): string {
  const words = ['No', 'One', 'Two', 'Three']
  const side = opts.half === 'top' ? 'Top' : 'Bottom'
  const onBase = opts.runnersOn === 0 ? 'Nobody on' : `${words[opts.runnersOn]} on`
  const outs = `${words[opts.outs].toLowerCase()} out${opts.outs === 1 ? '' : 's'}`
  const count = opts.balls === 0 && opts.strikes === 0 ? '' : ` You left it at a ${opts.balls}–${opts.strikes} count.`
  return `${side} of the ${ordinal(opts.inning)}. ${onBase}, ${outs}, ${opts.batterSurname} up.${count}`
}

/** Batting averages print without a leading zero: .281, and .000 at no at-bats. */
export function formatRate(value: number): string {
  return value.toFixed(3).replace(/^0\./, '.')
}

/** Run differential prints signed, with a true minus sign, per the Season mockup. */
export function formatRunDifferential(value: number): string {
  if (value > 0) return `+${value}`
  if (value < 0) return `−${Math.abs(value)}`
  return '0'
}

/** Games back: a dash for the leader, otherwise the half-game count. */
export function formatGamesBack(value: number): string {
  return value === 0 ? '—' : String(value)
}

/** The save-code box shows the head, the tail and a length, so a short paste is visible. */
export function saveCodeExcerpt(code: string, edge = 28): string {
  if (code.length <= edge * 2 + 1) return code
  return `${code.slice(0, edge)}…${code.slice(-edge)}`
}

export function formatCharacterCount(n: number): string {
  return `${n.toLocaleString('en-US')} characters`
}

/** "saved 2 hours ago" for the paste preview line. */
export function relativeTime(fromIso: string, now: number = Date.now()): string {
  const then = Date.parse(fromIso)
  if (Number.isNaN(then)) return 'at an unknown time'
  const seconds = Math.max(0, Math.round((now - then) / 1000))
  if (seconds < 60) return 'just now'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.round(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

/**
 * The paste-preview line from section 6.1: "Game 7 · Herons 4–2 · bottom 4th".
 * `previewOf` reports facts; the wording is assembled here.
 */
export function previewSummary(p: {
  teamName: string
  gameNumber: number | null
  inGame: boolean
  half: HalfInning | null
  inning: number | null
  ownScore: number | null
  opponentScore: number | null
}): string {
  const parts: string[] = []
  if (p.gameNumber !== null) parts.push(`Game ${p.gameNumber}`)
  if (p.inGame && p.ownScore !== null && p.opponentScore !== null) {
    parts.push(`${p.teamName} ${p.ownScore}–${p.opponentScore}`)
  } else {
    parts.push(p.teamName)
  }
  if (p.inGame && p.half !== null && p.inning !== null) {
    parts.push(`${p.half === 'top' ? 'top' : 'bottom'} ${ordinal(p.inning)}`)
  } else {
    parts.push('between games')
  }
  return parts.join(' · ')
}

/**
 * The two-line prose summary of a simulated half-inning
 * (docs/mockups/Between.dc.html shows a recap, not a play-by-play dump).
 * Built from the recap's numbers so it stays short however long the inning.
 */
export function describeHalfInning(r: { runs: number; hits: number; leftOnBase: number; plays: number }): string {
  const runs = r.runs === 0 ? 'No runs.' : `${r.runs} run${r.runs === 1 ? '' : 's'}.`
  if (r.hits === 0 && r.leftOnBase === 0 && r.runs === 0) {
    return r.plays <= 3 ? 'Three up, three down. No runs.' : 'Nobody reached. No runs.'
  }
  const hits = r.hits === 0 ? 'No hits' : `${r.hits} hit${r.hits === 1 ? '' : 's'}`
  const stranded =
    r.leftOnBase === 0 ? '' : ` ${r.leftOnBase} left on base.`
  return `${hits} in ${r.plays} batter${r.plays === 1 ? '' : 's'}. ${runs}${stranded}`
}

/**
 * The between-innings milestone line (GAME_DESIGN.md section 6).
 *
 * Section 6 names the milestones and says one should surface between
 * innings, but neither it nor Between.dc.html specifies the wording, so
 * these labels are a UI choice. Returns null when nothing fired, so the
 * screen renders no empty band; several milestones can fire on the same
 * game (a season-ending shutout, say) and are joined in the order
 * checkMilestones reported them.
 */
export function milestoneLine(fired: readonly string[]): string | null {
  if (fired.length === 0) return null
  const labels: Record<string, string> = {
    'first-hr': 'First home run of the season',
    'first-walk-off': 'First walk-off win',
    'first-shutout': 'First shutout',
    'games-played-mark': 'Ten games played',
    clinch: 'Winning season clinched',
    eliminated: 'Eliminated from a winning season',
    'season-over': 'Season complete'
  }
  return fired.map((id) => labels[id] ?? id).join(' · ')
}

/**
 * The result line shown when a game is over: "Herons win 5–4", winner
 * first. Every team's short name is a plural bird ("Herons", "Wrens"), so
 * "win" is right for all of them and no singular case is needed.
 *
 * Returns null for a tied score, which the engine never produces for a
 * finished game (§4 keeps playing while the score is level) — the guard is
 * here so a caller cannot render "Herons win 4–4".
 */
export function gameResultLine(opts: {
  homeShort: string
  awayShort: string
  homeScore: number
  awayScore: number
}): string | null {
  if (opts.homeScore === opts.awayScore) return null
  const winner = opts.homeScore > opts.awayScore ? opts.homeShort : opts.awayShort
  const high = Math.max(opts.homeScore, opts.awayScore)
  const low = Math.min(opts.homeScore, opts.awayScore)
  return `${winner} win ${high}–${low}`
}
