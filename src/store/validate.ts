/**
 * Runtime shape guards. `JSON.parse` on a corrupted or hand-edited value
 * can hand back anything -- these are the checks that let `load()` and
 * `decodeSaveCode()` tell "valid JSON but the wrong shape" apart from a
 * real envelope/AppState, without throwing.
 *
 * Deliberately shallow: enough to reject garbage (wrong types, missing
 * required fields) without re-implementing full engine validation here.
 */

import type { AnyVersionEnvelope, AppState } from './types'

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x)
}

export function isEnvelopeLike(x: unknown): x is AnyVersionEnvelope {
  return (
    isRecord(x) &&
    typeof x.v === 'number' &&
    typeof x.savedAt === 'string' &&
    typeof x.device === 'string' &&
    'state' in x
  )
}

function isSeasonStateLike(x: unknown): boolean {
  return (
    isRecord(x) &&
    Array.isArray(x.schedule) &&
    Array.isArray(x.standings) &&
    Array.isArray(x.batterStats) &&
    Array.isArray(x.log) &&
    Array.isArray(x.firedMilestones) &&
    typeof x.rngState === 'number'
  )
}

function isGameStateLike(x: unknown): boolean {
  return (
    isRecord(x) &&
    typeof x.gameIndex === 'number' &&
    typeof x.homeTeamId === 'string' &&
    typeof x.awayTeamId === 'string' &&
    typeof x.inning === 'number' &&
    (x.half === 'top' || x.half === 'bottom') &&
    typeof x.outs === 'number' &&
    isRecord(x.bases) &&
    typeof x.homeScore === 'number' &&
    typeof x.awayScore === 'number' &&
    typeof x.isOver === 'boolean'
  )
}

export function isAppState(x: unknown): x is AppState {
  return (
    isRecord(x) &&
    typeof x.teamName === 'string' &&
    isSeasonStateLike(x.season) &&
    (x.currentGame === null || isGameStateLike(x.currentGame))
  )
}
