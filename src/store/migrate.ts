/**
 * Save schema migration (GAME_DESIGN.md 6.1).
 *
 * `migrate()` walks an envelope of any older version up to
 * SAVE_SCHEMA_VERSION, one step at a time, so a future version bump is
 * "add one more `if (v === N)` rung to the ladder", not a rewrite. A
 * version newer than this build understands is refused (thrown, not
 * silently accepted) -- there is no way to migrate a save *backwards*.
 */

import type { AnyVersionEnvelope, AppState, SaveEnvelope } from './types'
import { SAVE_SCHEMA_VERSION } from './types'

export const DEFAULT_TEAM_NAME = 'Harbor Herons'

/** Thrown by migrate() when the save is from a build newer than this one. */
export class SchemaTooNewError extends Error {
  readonly foundVersion: number

  constructor(foundVersion: number) {
    super(`Save schema v${foundVersion} is newer than this app supports (v${SAVE_SCHEMA_VERSION}).`)
    this.name = 'SchemaTooNewError'
    this.foundVersion = foundVersion
  }
}

/**
 * v0 -> v1: `teamName` (the Settings "Team name" field) was added to the
 * persisted state's shape in schema v1. A v0 save predates it, so default
 * it. Trivial by construction -- v0 never actually shipped, this exists
 * so the migration mechanism is exercised (6.1's "v: 0 is migrated" test)
 * and so the next real migration has a rung of the ladder to copy.
 */
function migrateV0toV1(state: unknown): AppState {
  const record = (typeof state === 'object' && state !== null ? state : {}) as Record<string, unknown>
  const teamName = typeof record.teamName === 'string' ? record.teamName : DEFAULT_TEAM_NAME
  return { ...record, teamName } as AppState
}

export function migrate(envelope: AnyVersionEnvelope): SaveEnvelope {
  if (envelope.v > SAVE_SCHEMA_VERSION) {
    throw new SchemaTooNewError(envelope.v)
  }

  let v = envelope.v
  let state = envelope.state

  while (v < SAVE_SCHEMA_VERSION) {
    if (v === 0) {
      state = migrateV0toV1(state)
      v = 1
      continue
    }
    // Unreachable today (only v0 -> v1 exists), but fail loudly instead of
    // silently returning a mid-migration state if that ever changes.
    throw new Error(`No migration path from save schema v${v}`)
  }

  return { v: SAVE_SCHEMA_VERSION, savedAt: envelope.savedAt, device: envelope.device, state: state as AppState }
}
