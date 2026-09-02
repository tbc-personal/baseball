/**
 * localStorage persistence: save after every engine transition, load on
 * startup, and the "Undo load" stash for the save-code import flow
 * (GAME_DESIGN.md 6 and 6.1).
 */

import type { AppState, SaveEnvelope } from './types'
import { SAVE_SCHEMA_VERSION } from './types'
import type { StorageLike } from './storage'
import { migrate, DEFAULT_TEAM_NAME } from './migrate'
import { isAppState, isEnvelopeLike } from './validate'
import { createSeason } from '../engine/season'

export const SAVE_KEY = 'shortSeason:save'
/** Holds the local state a save-code import replaced, for one "Undo load". */
export const UNDO_KEY = 'shortSeason:save:undo'

/** A brand-new season: no game in progress, default team name. */
export function freshAppState(seed: number, teamName: string = DEFAULT_TEAM_NAME): AppState {
  return { teamName, season: createSeason(seed), currentGame: null }
}

/** Parse+validate+migrate a raw localStorage string. null on any failure (never throws). */
function readEnvelope(raw: string | null): SaveEnvelope | null {
  if (raw == null) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!isEnvelopeLike(parsed)) return null
    const migrated = migrate(parsed)
    if (!isAppState(migrated.state)) return null
    return migrated
  } catch {
    // Covers: invalid JSON, a schema version newer than this build
    // (migrate() throws SchemaTooNewError), or any other migration
    // failure. All of these mean "can't use this local save".
    return null
  }
}

/**
 * Write `state` as the current save. Cheap and synchronous (uncompressed
 * JSON, no read-before-write) because this runs after every engine
 * transition (PLAN.md 2/3) -- unlike the save-code export, size and
 * compression don't matter here, only speed.
 */
export function save(storage: StorageLike, state: AppState, device: string, now: () => string = () => new Date().toISOString()): void {
  const envelope: SaveEnvelope = { v: SAVE_SCHEMA_VERSION, savedAt: now(), device, state }
  storage.setItem(SAVE_KEY, JSON.stringify(envelope))
}

/**
 * Load the current save. A corrupted or unparseable value -- or one that
 * parses as JSON but isn't a save envelope, or a save schema newer than
 * this build -- falls back to a fresh season rather than throwing.
 */
export function load(storage: StorageLike, seed: number, teamName: string = DEFAULT_TEAM_NAME): AppState {
  const envelope = readEnvelope(storage.getItem(SAVE_KEY))
  return envelope ? envelope.state : freshAppState(seed, teamName)
}

/** The full local save envelope (for comparing "is the pasted save older?"), or null if there is none/it's unusable. */
export function loadLocalEnvelope(storage: StorageLike): SaveEnvelope | null {
  return readEnvelope(storage.getItem(SAVE_KEY))
}

/**
 * Apply an imported save code's envelope as the new local save, per the
 * "Load this save" button (6.1). Stashes whatever was there before under
 * UNDO_KEY so "Undo load" can restore it once.
 */
export function applyImportedSave(storage: StorageLike, envelope: SaveEnvelope): void {
  const existing = storage.getItem(SAVE_KEY)
  if (existing != null) {
    storage.setItem(UNDO_KEY, existing)
  } else {
    storage.removeItem(UNDO_KEY)
  }
  storage.setItem(SAVE_KEY, JSON.stringify(envelope))
}

/**
 * Restore the state an import replaced, consuming the stash (works once).
 * Returns null if there is nothing to undo, or it turns out unusable.
 */
export function undoLoad(storage: StorageLike): AppState | null {
  const stashedRaw = storage.getItem(UNDO_KEY)
  if (stashedRaw == null) return null
  storage.removeItem(UNDO_KEY)

  const stashed = readEnvelope(stashedRaw)
  if (!stashed) return null

  storage.setItem(SAVE_KEY, JSON.stringify(stashed))
  return stashed.state
}
